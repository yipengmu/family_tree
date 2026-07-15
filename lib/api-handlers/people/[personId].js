import prisma from '../../prisma.js';
import { authenticateRequest, requireTenantRole, sendAuthError } from '../../auth.js';
import { toClientPerson, updateFamilyPerson } from '../../familyData.js';
import { redactPerson } from '../../privacy.js';

const READ_ROLES = ['OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'];
const WRITE_ROLES = ['OWNER', 'EDITOR'];

export default async function handler(req, res) {
  if (!['GET', 'PATCH', 'OPTIONS'].includes(req.method)) return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = authenticateRequest(req);
    const tenantId = req.body?.tenantId || req.query.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, error: '缺少家谱 ID' });
    const role = req.method === 'GET' ? READ_ROLES : WRITE_ROLES;
    const membership = await requireTenantRole(prisma, user.userId, tenantId, role);
    const person = await prisma.familyData.findUnique({
      where: { tenant_id_person_id: { tenant_id: tenantId, person_id: String(req.query.personId) } },
    });
    if (!person) return res.status(404).json({ success: false, error: '人物不存在' });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });

    if (req.method === 'GET') {
      return res.json({ success: true, person: redactPerson(toClientPerson(person), { role: membership.role, tenantSettings: tenant?.settings }) });
    }

    const result = await updateFamilyPerson(prisma, {
      tenantId,
      personId: req.query.personId,
      patch: req.body || {},
      expectedVersion: req.body?.expectedVersion,
      userId: user.userId,
    });
    return res.json({
      success: true,
      person: redactPerson(result.person, { role: membership.role, tenantSettings: tenant?.settings }),
      version: result.version,
    });
  } catch (error) {
    console.error('更新家谱人物失败:', error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
