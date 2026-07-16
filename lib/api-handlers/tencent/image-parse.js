import prisma from "../../prisma.js";
import {
  ApiAuthError,
  authenticateRequest,
  sendAuthError,
} from "../../auth.js";
import { parseFamilyTreeImages } from "../../cloud/ai.js";
import { getTokenHubConfig } from "../../cloud/config.js";
import { signDownload } from "../../cloud/storage.js";
import {
  parseFamilyTreeImageSources,
  validateFamilyTreeDraft,
} from "../../familyTreeImage.js";
import { FAMILY_TREE_IMAGE_PROMPT_VERSION } from "../../prompts/familyTreeImage.js";
import { createAuditLog, requireStoryWrite } from "../../personStories.js";
import { recordCloudUsage } from "../../cloud/usage.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  let job = null;
  try {
    const user = authenticateRequest(req);
    const { tenantId } = req.body || {};
    await requireStoryWrite(prisma, user.userId, tenantId);
    const existingCount = await prisma.familyData.count({
      where: { tenant_id: tenantId },
    });
    if (existingCount > 0) {
      return res.status(409).json({
        success: false,
        error: "照片建谱仅支持空白家谱初始化；当前家谱已有数据，不能覆盖",
      });
    }

    let sources;
    try {
      sources = parseFamilyTreeImageSources(req.body, tenantId);
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const model = getTokenHubConfig().visionModel;
    job = await prisma.aiProcessingJob.create({
      data: {
        tenant_id: tenantId,
        kind: "FAMILY_TREE_IMAGE_PARSE",
        provider: "TENCENT_TOKENHUB",
        status: "PROCESSING",
        input_snapshot: JSON.stringify({
          images: sources.map((source) => ({ objectKey: source.objectKey })),
          model,
          promptVersion: FAMILY_TREE_IMAGE_PROMPT_VERSION,
        }),
        attempts: 1,
      },
    });

    const imageUrls = await Promise.all(
      sources.map((source) =>
        source.objectKey
          ? signDownload(source.objectKey, 3600)
          : source.imageUrl,
      ),
    );
    const parsed = await parseFamilyTreeImages({ imageUrls });
    await recordCloudUsage(prisma, {
      tenantId,
      provider: "TENCENT_TOKENHUB",
      metric: "TOKENS",
      quantity: Number(parsed.usage?.total_tokens || 0),
      unit: "token",
      metadata: {
        model,
        kind: "FAMILY_TREE_IMAGE_PARSE",
        promptVersion: FAMILY_TREE_IMAGE_PROMPT_VERSION,
      },
    });
    const people = validateFamilyTreeDraft(parsed.data?.people);
    const analyses = [
      {
        sources: sources.map((source) => ({ objectKey: source.objectKey })),
        rawText: String(parsed.data?.rawText || ""),
        warnings: Array.isArray(parsed.data?.warnings)
          ? parsed.data.warnings
          : [],
        people,
      },
    ];

    await prisma.aiProcessingJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        output_snapshot: JSON.stringify(analyses),
      },
    });
    await createAuditLog(prisma, {
      tenantId,
      actorUserId: user.userId,
      action: "PARSE",
      entityType: "AI_PROCESSING_JOB",
      entityId: job.id,
      metadata: {
        imageCount: sources.length,
        model,
        promptVersion: FAMILY_TREE_IMAGE_PROMPT_VERSION,
      },
    });

    const candidates = people.filter((person) => person.name);
    return res.json({
      success: true,
      data: candidates,
      count: candidates.length,
      jobId: job.id,
      analyses,
    });
  } catch (error) {
    if (job) {
      await prisma.aiProcessingJob
        .update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            error_message: String(error?.message || "图片解析失败").slice(
              0,
              1000,
            ),
          },
        })
        .catch(() => null);
    }
    console.error("腾讯混元家谱图片解析失败:", error);
    if (
      error instanceof ApiAuthError &&
      /TENCENT_TOKENHUB_|TENCENT_VISION_MODEL/.test(error.message)
    ) {
      return sendAuthError(
        res,
        new ApiAuthError(503, "图片解析服务暂未完成配置，请联系管理员"),
      );
    }
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
