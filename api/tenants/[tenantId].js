import prisma from '../../lib/prisma.js';
import { authenticateRequest, DEFAULT_TENANT_ID, requireTenantRole, sendAuthError } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { tenantId } = req.query;

  try {
    if (tenantId === DEFAULT_TENANT_ID) {
      if (req.method === 'GET') return res.json({ success: true, tenant: { id: tenantId, name: '穆氏示范家谱', isDefault: true, readOnly: true } });
      return res.status(403).json({ success: false, error: '示范家谱不可修改或删除' });
    }

    const user = authenticateRequest(req);
    if (req.method === 'GET') {
      const membership = await requireTenantRole(prisma, user.userId, tenantId, ['OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER']);
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return res.status(404).json({ success: false, error: '家谱不存在' });
      return res.json({
        success: true,
        tenant: { ...tenant, settings: JSON.parse(tenant.settings || '{}'), role: membership.role, readOnly: !['OWNER', 'EDITOR'].includes(membership.role) },
      });
    }

    if (req.method === 'DELETE') {
      await requireTenantRole(prisma, user.userId, tenantId, ['OWNER']);
      await prisma.tenant.delete({ where: { id: tenantId } });
      return res.json({ success: true, message: '家谱已删除' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('家谱空间操作失败:', error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
