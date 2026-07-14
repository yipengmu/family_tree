import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { authenticateRequest, requireTenantRole, sendAuthError } from '../../lib/auth.js';
import { isInvitationMailConfigured, sendInvitationEmail } from '../../lib/tencentMail.js';
import { createAuditLog } from '../../lib/personStories.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const user = authenticateRequest(req);
    const { tenantId } = req.body || {};
    await requireTenantRole(prisma, user.userId, tenantId, ['OWNER']);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = String(req.body?.role || 'CONTRIBUTOR').toUpperCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: '请输入有效邮箱' });
    if (!['EDITOR', 'CONTRIBUTOR', 'VIEWER'].includes(role)) return res.status(400).json({ success: false, error: '不支持的成员角色' });
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await prisma.tenantMembership.findUnique({ where: { tenant_id_user_id: { tenant_id: tenantId, user_id: existingUser.id } } });
      if (existingMembership?.status === 'ACTIVE') return res.status(409).json({ success: false, error: '该用户已经是家谱成员' });
    }
    const [tenant, inviter] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.user.findUnique({ where: { id: Number(user.userId) } }),
    ]);
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    const invitation = await prisma.invitation.create({
      data: { tenant_id: tenantId, email, role, token_hash: hashToken(token), invited_by: Number(user.userId), expires_at: expiresAt },
    });
    const baseUrl = process.env.PUBLIC_APP_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/invitations/accept?token=${encodeURIComponent(token)}`;
    let emailSent = false;
    if (isInvitationMailConfigured()) {
      await sendInvitationEmail({ to: email, familyName: tenant?.name || '家谱', inviterName: inviter?.username || '家人', inviteUrl, expiresAt: expiresAt.toISOString().slice(0, 10) });
      emailSent = true;
    }
    await createAuditLog(prisma, { tenantId, actorUserId: user.userId, action: 'INVITE', entityType: 'INVITATION', entityId: invitation.id, metadata: { email, role } });
    return res.status(201).json({ success: true, invitation: { id: invitation.id, email, role, expiresAt }, inviteUrl, emailSent });
  } catch (error) {
    console.error('创建家谱邀请失败:', error);
    return sendAuthError(res, error);
  }
}
