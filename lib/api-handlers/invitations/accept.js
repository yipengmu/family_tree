import crypto from 'crypto';
import prisma from '../../prisma.js';
import { authenticateRequest, sendAuthError } from '../../auth.js';
import { createAuditLog } from '../../personStories.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const userToken = authenticateRequest(req);
    const rawToken = String(req.body?.token || '');
    if (!rawToken) return res.status(400).json({ success: false, error: '邀请链接无效' });
    const [invitation, user] = await Promise.all([
      prisma.invitation.findUnique({ where: { token_hash: hashToken(rawToken) }, include: { tenant: true } }),
      prisma.user.findUnique({ where: { id: Number(userToken.userId) } }),
    ]);
    if (!invitation || invitation.status !== 'PENDING' || invitation.expires_at <= new Date()) return res.status(410).json({ success: false, error: '邀请不存在或已过期' });
    if (!user || !user.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) return res.status(403).json({ success: false, error: '请先绑定被邀请的邮箱后再接受邀请' });
    await prisma.$transaction([
      prisma.tenantMembership.upsert({
        where: { tenant_id_user_id: { tenant_id: invitation.tenant_id, user_id: user.id } },
        create: { tenant_id: invitation.tenant_id, user_id: user.id, role: invitation.role, status: 'ACTIVE' },
        update: { role: invitation.role, status: 'ACTIVE' },
      }),
      prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', accepted_at: new Date() } }),
    ]);
    await createAuditLog(prisma, { tenantId: invitation.tenant_id, actorUserId: user.id, action: 'ACCEPT', entityType: 'INVITATION', entityId: invitation.id });
    return res.json({ success: true, tenant: { id: invitation.tenant.id, name: invitation.tenant.name, role: invitation.role } });
  } catch (error) {
    console.error('接受家谱邀请失败:', error);
    return sendAuthError(res, error);
  }
}
