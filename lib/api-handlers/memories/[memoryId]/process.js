import prisma from "../../../prisma.js";
import { authenticateRequest, sendAuthError } from "../../../auth.js";
import { extractLifeEvents } from "../../../cloud/ai.js";
import { signDownload } from "../../../cloud/storage.js";
import {
  createTranscriptionTask,
  getTranscriptionTask,
} from "../../../cloud/speech.js";
import {
  canMutateContribution,
  requireStoryWrite,
  serializeMemory,
} from "../../../personStories.js";
import { recordCloudUsage } from "../../../cloud/usage.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  try {
    const user = authenticateRequest(req);
    const memory = await prisma.memory.findUnique({
      where: { id: req.query.memoryId },
      include: {
        assets: true,
        aiJobs: { orderBy: { created_at: "desc" } },
        person: true,
        creator: true,
      },
    });
    if (!memory || memory.deleted_at)
      return res.status(404).json({ success: false, error: "记忆不存在" });
    const membership = await requireStoryWrite(
      prisma,
      user.userId,
      memory.tenant_id,
    );
    if (!canMutateContribution(memory, membership, user.userId))
      return res.status(403).json({ success: false, error: "无权处理此记忆" });

    let transcript = memory.transcript_raw;
    const audio = memory.assets.find(
      (asset) =>
        asset.kind === "AUDIO" && asset.status === "READY" && !asset.deleted_at,
    );
    let transcriptionJob = memory.aiJobs.find(
      (job) => job.kind === "TRANSCRIBE" && !["FAILED"].includes(job.status),
    );

    if (!transcript && audio) {
      if (!transcriptionJob?.provider_task_id) {
        const audioUrl = await signDownload(audio.object_key, 3600);
        const task = await createTranscriptionTask(audioUrl);
        await recordCloudUsage(prisma, {
          tenantId: memory.tenant_id,
          provider: "TENCENT_ASR",
          metric: "TRANSCRIPTION_TASKS",
          quantity: 1,
          unit: "task",
          metadata: { memoryId: memory.id, assetId: audio.id },
        });
        transcriptionJob = await prisma.aiProcessingJob.create({
          data: {
            tenant_id: memory.tenant_id,
            memory_id: memory.id,
            asset_id: audio.id,
            kind: "TRANSCRIBE",
            status: "PROCESSING",
            provider_task_id: task.taskId,
            input_snapshot: JSON.stringify({ assetId: audio.id }),
            attempts: 1,
          },
        });
        await prisma.memory.update({
          where: { id: memory.id },
          data: { status: "PROCESSING" },
        });
        return res
          .status(202)
          .json({
            success: true,
            status: "PROCESSING",
            job: {
              id: transcriptionJob.id,
              kind: transcriptionJob.kind,
              status: transcriptionJob.status,
            },
          });
      }

      const task = await getTranscriptionTask(
        transcriptionJob.provider_task_id,
      );
      if (["PENDING", "PROCESSING"].includes(task.status)) {
        return res
          .status(202)
          .json({
            success: true,
            status: task.status,
            job: {
              id: transcriptionJob.id,
              kind: transcriptionJob.kind,
              status: task.status,
            },
          });
      }
      if (task.status === "FAILED") {
        await prisma.aiProcessingJob.update({
          where: { id: transcriptionJob.id },
          data: {
            status: "FAILED",
            error_message: task.error || "语音转写失败",
            output_snapshot: JSON.stringify(task.raw),
          },
        });
        await prisma.memory.update({
          where: { id: memory.id },
          data: { status: "FAILED" },
        });
        return res
          .status(502)
          .json({ success: false, error: task.error || "语音转写失败" });
      }
      transcript = task.transcript;
      await prisma.$transaction([
        prisma.aiProcessingJob.update({
          where: { id: transcriptionJob.id },
          data: {
            status: "SUCCEEDED",
            output_snapshot: JSON.stringify(task.raw),
          },
        }),
        prisma.mediaAsset.update({
          where: { id: audio.id },
          data: {
            duration_seconds: task.durationSeconds || audio.duration_seconds,
          },
        }),
        prisma.memory.update({
          where: { id: memory.id },
          data: {
            transcript_raw: transcript,
            transcript_details: JSON.stringify(task.details || []),
            status: "PROCESSING",
          },
        }),
      ]);
    }

    const sourceText = memory.corrected_text || transcript || memory.raw_text;
    if (!String(sourceText || "").trim())
      return res
        .status(400)
        .json({ success: false, error: "请先录音或填写一段故事" });
    const existingExtraction = await prisma.aiProcessingJob.findFirst({
      where: {
        memory_id: memory.id,
        kind: "EXTRACT_EVENTS",
        status: "SUCCEEDED",
      },
      orderBy: { created_at: "desc" },
    });
    if (!existingExtraction || req.body?.force === true) {
      const result = await extractLifeEvents({
        transcript,
        correctedText: memory.corrected_text || memory.raw_text,
        personName: memory.person.name,
      });
      await recordCloudUsage(prisma, {
        tenantId: memory.tenant_id,
        provider: "TOKENHUB",
        metric: "TOKENS",
        quantity: Number(result.usage?.total_tokens || 0),
        unit: "token",
        metadata: { model: "story", memoryId: memory.id },
      });
      await prisma.$transaction([
        prisma.aiProcessingJob.create({
          data: {
            tenant_id: memory.tenant_id,
            memory_id: memory.id,
            kind: "EXTRACT_EVENTS",
            status: "SUCCEEDED",
            input_snapshot: JSON.stringify({
              source: memory.corrected_text
                ? "correctedText"
                : transcript
                  ? "transcript"
                  : "rawText",
            }),
            output_snapshot: JSON.stringify(result.data),
            attempts: 1,
          },
        }),
        prisma.memory.update({
          where: { id: memory.id },
          data: { status: "READY" },
        }),
      ]);
    }
    const refreshed = await prisma.memory.findUnique({
      where: { id: memory.id },
      include: {
        assets: true,
        aiJobs: { orderBy: { created_at: "desc" } },
        creator: true,
      },
    });
    return res.json({
      success: true,
      status: "READY",
      memory: serializeMemory(refreshed, { includeDrafts: true }),
    });
  } catch (error) {
    console.error("处理人物记忆失败:", error);
    return sendAuthError(res, error);
  }
}
