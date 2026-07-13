import crypto from 'crypto';
import OSS from 'ali-oss';
import prisma from '../../lib/prisma.js';
import { authenticateRequest, requireTenantRole, sendAuthError } from '../../lib/auth.js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const user = authenticateRequest(req);
    const { tenantId, fileName, contentType, fileSize } = req.body || {};
    await requireTenantRole(prisma, user.userId, tenantId, ['OWNER', 'EDITOR', 'CONTRIBUTOR']);
    if (!ALLOWED_TYPES.has(contentType) || Number(fileSize) > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: '图片格式或大小不符合要求' });
    }

    const required = ['OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];
    if (required.some((key) => !process.env[key])) return res.status(503).json({ success: false, error: '图片存储服务尚未配置' });

    const extension = String(fileName || '').split('.').pop().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
    const objectKey = `family-tree/${tenantId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const client = new OSS({
      region: process.env.OSS_REGION,
      bucket: process.env.OSS_BUCKET,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      endpoint: process.env.OSS_ENDPOINT || undefined,
      secure: true,
    });
    const uploadUrl = client.signatureUrl(objectKey, {
      method: 'PUT',
      expires: 300,
      'Content-Type': contentType,
    });
    const fileUrl = client.generateObjectUrl(objectKey);
    return res.json({ success: true, uploadUrl, fileUrl, objectKey, expiresIn: 300 });
  } catch (error) {
    console.error('生成上传签名失败:', error);
    return sendAuthError(res, error);
  }
}
