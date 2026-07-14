import prisma from '../../../lib/prisma.js';
import { authenticateRequest, sendAuthError } from '../../../lib/auth.js';
import { headObject } from '../../../lib/cloud/storage.js';
import { canMutateContribution, requireStoryWrite, serializeAsset } from '../../../lib/personStories.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const user = authenticateRequest(req);
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.query.assetId } });
    if (!asset || asset.deleted_at) return res.status(404).json({ success: false, error: '媒体不存在' });
    const membership = await requireStoryWrite(prisma, user.userId, asset.tenant_id);
    if (!canMutateContribution(asset, membership, user.userId)) return res.status(403).json({ success: false, error: '无权完成此媒体上传' });
    const head = await headObject(asset.object_key);
    const actualSize = Number(head.headers?.['content-length'] || head['content-length'] || asset.file_size);
    if (actualSize !== asset.file_size) return res.status(409).json({ success: false, error: '媒体大小与申请上传时不一致' });
    const updated = await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: 'READY',
        duration_seconds: req.body?.durationSeconds ? Number(req.body.durationSeconds) : asset.duration_seconds,
        checksum_sha256: req.body?.checksumSha256 || asset.checksum_sha256,
      },
    });
    return res.json({ success: true, asset: serializeAsset(updated) });
  } catch (error) {
    console.error('确认媒体上传失败:', error);
    return sendAuthError(res, error);
  }
}
