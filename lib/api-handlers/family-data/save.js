import prisma from '../../prisma.js';
import { authenticateRequest, requireTenantRole, sendAuthError } from '../../auth.js';
import { replaceFamilyData } from '../../familyData.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const user = authenticateRequest(req);
    const { tenantId, familyData, expectedVersion } = req.body || {};
    if (!tenantId) return res.status(400).json({ success: false, error: '缺少家谱 ID' });
    if (!Array.isArray(familyData)) return res.status(400).json({ success: false, error: '家谱数据格式错误' });

    await requireTenantRole(prisma, user.userId, tenantId, ['OWNER', 'EDITOR']);
    const version = await replaceFamilyData(prisma, { tenantId, familyData, expectedVersion, userId: user.userId });
    return res.json({ success: true, message: '家谱数据保存成功', savedCount: familyData.length, version });
  } catch (error) {
    console.error('保存家谱数据失败:', error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
