import crypto from "crypto";
import prisma from "../../prisma.js";
import { authenticateRequest, sendAuthError } from "../../auth.js";
import { createObjectKey, signUpload } from "../../cloud/storage.js";
import { requirePerson, requireStoryWrite } from "../../personStories.js";
import { recordCloudUsage } from "../../cloud/usage.js";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
]);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  try {
    const user = authenticateRequest(req);
    const {
      tenantId,
      personId,
      memoryId,
      fileName,
      contentType,
      fileSize,
      kind,
    } = req.body || {};
    await requireStoryWrite(prisma, user.userId, tenantId);
    await requirePerson(prisma, tenantId, personId);

    const normalizedKind = String(kind || "").toUpperCase();
    const allowed = normalizedKind === "AUDIO" ? AUDIO_TYPES : IMAGE_TYPES;
    const maxSize =
      normalizedKind === "AUDIO" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (
      !["AUDIO", "PHOTO"].includes(normalizedKind) ||
      !allowed.has(contentType) ||
      Number(fileSize) <= 0 ||
      Number(fileSize) > maxSize
    ) {
      return res
        .status(400)
        .json({ success: false, error: "媒体格式或大小不符合要求" });
    }
    if (memoryId) {
      const memory = await prisma.memory.findFirst({
        where: {
          id: memoryId,
          tenant_id: tenantId,
          person_id: String(personId),
          deleted_at: null,
        },
      });
      if (!memory)
        return res
          .status(404)
          .json({ success: false, error: "记忆草稿不存在" });
    }

    const assetId = crypto.randomUUID();
    const category = normalizedKind === "AUDIO" ? "audio" : "photos";
    const objectKey = createObjectKey({
      tenantId,
      personId,
      category,
      assetId,
      fileName,
      contentType,
    });
    const asset = await prisma.mediaAsset.create({
      data: {
        id: assetId,
        tenant_id: tenantId,
        person_id: String(personId),
        memory_id: memoryId || null,
        created_by: Number(user.userId),
        kind: normalizedKind,
        object_key: objectKey,
        original_name: String(fileName || "").slice(0, 255),
        content_type: contentType,
        file_size: Number(fileSize),
      },
    });
    const signed = await signUpload({ objectKey, contentType });
    await recordCloudUsage(prisma, {
      tenantId,
      provider: "COS",
      metric: "UPLOAD_BYTES_RESERVED",
      quantity: Number(fileSize),
      unit: "bytes",
      metadata: { assetId: asset.id, kind: normalizedKind },
    });
    return res
      .status(201)
      .json({
        success: true,
        asset: { id: asset.id, kind: asset.kind, status: asset.status },
        ...signed,
      });
  } catch (error) {
    console.error("生成腾讯云 COS 上传签名失败:", error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
