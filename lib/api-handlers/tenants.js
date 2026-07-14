import prisma from '../prisma.js';
import { authenticateRequest, DEFAULT_TENANT_ID, sendAuthError } from '../auth.js';

const defaultTenant = () => ({
  id: DEFAULT_TENANT_ID,
  name: '穆氏示范家谱',
  description: '谱里公开示范家谱 · 游客只读',
  isDefault: true,
  role: 'VIEWER',
  readOnly: true,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const hasToken = Boolean(req.headers.authorization);
      if (!hasToken) return res.json({ success: true, data: [defaultTenant()], count: 1 });

      const user = authenticateRequest(req);
      const memberships = await prisma.tenantMembership.findMany({
        where: { user_id: Number(user.userId), status: 'ACTIVE' },
        include: { tenant: true },
        orderBy: { updated_at: 'desc' },
      });
      const tenants = memberships.map(({ tenant, role }) => ({
        id: tenant.id,
        name: tenant.name,
        description: tenant.description,
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at,
        settings: JSON.parse(tenant.settings || '{}'),
        role,
        isDefault: false,
        readOnly: role === 'VIEWER' || role === 'CONTRIBUTOR',
      }));
      const data = [defaultTenant(), ...tenants];
      return res.json({ success: true, data, count: data.length });
    }

    if (req.method === 'POST') {
      const user = authenticateRequest(req);
      const body = req.body || {};
      const name = String(body.name || '').trim();
      if (!name || name.length > 50) return res.status(400).json({ success: false, error: '家谱名称需为 1 至 50 个字符' });

      const id = body.id || `tenant_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const settings = {
        nameProtection: body.nameProtection !== false,
        publicAccess: body.publicAccess === true,
        livingPersonPrivacy: true,
      };
      const tenant = await prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({
          data: { id, name, description: String(body.description || '').slice(0, 200), settings: JSON.stringify(settings) },
        });
        await tx.tenantMembership.create({
          data: { tenant_id: created.id, user_id: Number(user.userId), role: 'OWNER' },
        });
        return created;
      });

      return res.status(201).json({
        success: true,
        tenant: { id: tenant.id, name: tenant.name, description: tenant.description, settings, role: 'OWNER', isDefault: false },
        message: '家谱创建成功',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('家谱空间请求失败:', error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
