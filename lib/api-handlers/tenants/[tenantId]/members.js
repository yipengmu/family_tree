import prisma from '../../../prisma.js';
import { authenticateRequest, requireTenantRole, sendAuthError } from '../../../auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const user = authenticateRequest(req);
    await requireTenantRole(prisma, user.userId, req.query.tenantId, ['OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER']);
    const memberships = await prisma.tenantMembership.findMany({
      where: { tenant_id: req.query.tenantId, status: 'ACTIVE' },
      include: { user: true },
      orderBy: { created_at: 'asc' },
    });
    return res.json({
      success: true,
      data: memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.created_at,
        user: { id: membership.user.id, name: membership.user.username, email: membership.user.email },
      })),
    });
  } catch (error) {
    console.error('读取家谱成员失败:', error);
    return sendAuthError(res, error);
  }
}
