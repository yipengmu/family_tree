import prisma from "../../prisma.js";
import { authenticateRequest, sendAuthError } from "../../auth.js";
import { parseFamilyTreeImage } from "../../cloud/ai.js";
import { getTokenHubConfig } from "../../cloud/config.js";
import { signDownload } from "../../cloud/storage.js";
import {
  normalizeFamilyTreePeople,
  parseFamilyTreeImageSources,
} from "../../familyTreeImage.js";
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
        }),
        attempts: 1,
      },
    });

    const people = [];
    const analyses = [];
    for (const source of sources) {
      const imageUrl = source.objectKey
        ? await signDownload(source.objectKey, 3600)
        : source.imageUrl;
      const parsed = await parseFamilyTreeImage({ imageUrl });
      await recordCloudUsage(prisma, {
        tenantId,
        provider: "TENCENT_TOKENHUB",
        metric: "TOKENS",
        quantity: Number(parsed.usage?.total_tokens || 0),
        unit: "token",
        metadata: { model, kind: "FAMILY_TREE_IMAGE_PARSE" },
      });

      const normalized = normalizeFamilyTreePeople(
        parsed.data?.people,
        people.length,
      );
      people.push(...normalized);
      analyses.push({
        source: { objectKey: source.objectKey },
        rawText: String(parsed.data?.rawText || ""),
        warnings: Array.isArray(parsed.data?.warnings)
          ? parsed.data.warnings
          : [],
        people: normalized,
      });
    }

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
      metadata: { imageCount: sources.length, model },
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
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
