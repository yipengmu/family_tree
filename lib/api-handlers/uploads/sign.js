import prisma from "../../prisma.js";
import {
  ApiAuthError,
  authenticateRequest,
  requireTenantRole,
  sendAuthError,
} from "../../auth.js";
import {
  createObjectKey,
  signDownload,
  signUpload,
} from "../../cloud/storage.js";
import { recordCloudUsage } from "../../cloud/usage.js";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  try {
    const user = authenticateRequest(req);
    const { tenantId, fileName, contentType, fileSize } = req.body || {};
    await requireTenantRole(prisma, user.userId, tenantId, [
      "OWNER",
      "EDITOR",
      "CONTRIBUTOR",
    ]);
    if (
      !ALLOWED_TYPES.has(contentType) ||
      Number(fileSize) > 10 * 1024 * 1024
    ) {
      return res
        .status(400)
        .json({ success: false, error: "图片格式或大小不符合要求" });
    }

    const objectKey = createObjectKey({
      tenantId,
      category: "imports",
      fileName,
      contentType,
    });
    const { uploadUrl, expiresIn } = await signUpload({
      objectKey,
      contentType,
    });
    const fileUrl = await signDownload(objectKey, 3600);
    await recordCloudUsage(prisma, {
      tenantId,
      provider: "COS",
      metric: "UPLOAD_BYTES_RESERVED",
      quantity: Number(fileSize),
      unit: "bytes",
      metadata: { kind: "IMPORT" },
    });
    return res.json({
      success: true,
      uploadUrl,
      fileUrl,
      objectKey,
      expiresIn,
    });
  } catch (error) {
    console.error("生成上传签名失败:", error);
    if (
      error instanceof ApiAuthError &&
      /TENCENT_(?:COS|CLOUD)|TENCENTCLOUD_/.test(error.message)
    ) {
      return sendAuthError(
        res,
        new ApiAuthError(503, "图片存储服务暂未完成配置，请联系管理员"),
      );
    }
    return sendAuthError(res, error);
  }
}
