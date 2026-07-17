import jwt from 'jsonwebtoken';

export const DEFAULT_TENANT_ID = process.env.REACT_APP_DEFAULT_TENANT_ID || 'default';

export class ApiAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== 'production') return 'local-development-only-change-me';
  throw new ApiAuthError(500, '服务端认证配置不完整');
}

export function authenticateRequest(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiAuthError(401, '访问令牌缺失');

  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error instanceof ApiAuthError) throw error;
    throw new ApiAuthError(403, '令牌无效或已过期');
  }
}

export async function requireTenantRole(prisma, userId, tenantId, allowedRoles) {
  if (!tenantId || tenantId === DEFAULT_TENANT_ID) {
    throw new ApiAuthError(403, '示范家谱为只读内容');
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: Number(userId) } },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ApiAuthError(403, '无权访问此家谱');
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new ApiAuthError(403, '当前角色无权执行此操作');
  }
  return membership;
}

export function getAdminEmails() {
  const configured = process.env.ADMIN_EMAILS || 'yipengmu@gmail.com';
  return configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true, email: true, username: true, is_active: true },
  });

  if (!user || !user.is_active || !getAdminEmails().includes(user.email.toLowerCase())) {
    throw new ApiAuthError(403, '仅管理员可以访问数据分析后台');
  }

  return user;
}

export function sendAuthError(res, error) {
  const status = error instanceof ApiAuthError ? error.status : 500;
  return res.status(status).json({ success: false, error: error.message || '认证失败' });
}
