import prisma from "../../../prisma.js";
import { authenticateRequest, sendAuthError } from "../../../auth.js";
import { signDownload } from "../../../cloud/storage.js";
import { canReadPrivate, requireStoryRead } from "../../../personStories.js";
import { recordCloudUsage } from "../../../cloud/usage.js";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  try {
    const user = authenticateRequest(req);
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: req.query.assetId },
      include: { memory: true },
    });
    if (!asset || asset.deleted_at || asset.status !== "READY")
      return res.status(404).json({ success: false, error: "媒体不存在" });
    await requireStoryRead(prisma, user.userId, asset.tenant_id);
    if (asset.memory && !canReadPrivate(asset.memory, user.userId))
      return res
        .status(403)
        .json({ success: false, error: "无权读取此私密内容" });
    const url = await signDownload(asset.object_key, 300);
    await recordCloudUsage(prisma, {
      tenantId: asset.tenant_id,
      provider: "COS",
      metric: "SIGNED_DOWNLOADS",
      quantity: 1,
      unit: "request",
      metadata: { assetId: asset.id },
    });
    return res.json({ success: true, url, expiresIn: 300 });
  } catch (error) {
    console.error("生成媒体读取地址失败:", error);
    return sendAuthError(res, error);
  }
}
