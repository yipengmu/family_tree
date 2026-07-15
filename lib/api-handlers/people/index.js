import prisma from '../../prisma.js';
import { authenticateRequest, requireTenantRole, sendAuthError } from '../../auth.js';
import { createFamilyPerson, toClientPerson } from '../../familyData.js';
import { redactPerson } from '../../privacy.js';

const READ_ROLES = ['OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'];
const WRITE_ROLES = ['OWNER', 'EDITOR'];

export default async function handler(req, res) {
  if (!['POST', 'OPTIONS'].includes(req.method)) return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = authenticateRequest(req);
    const body = req.body || {};
    const tenantId = body.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) return res.status(400).json({ success: false, error: '缺少家谱 ID' });
    const membership = await requireTenantRole(prisma, user.userId, tenantId, WRITE_ROLES);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    const input = body.person || body;
    const result = await createFamilyPerson(prisma, {
      tenantId,
      person: input,
      expectedVersion: body.expectedVersion,
      userId: user.userId,
    });

    return res.status(201).json({
      success: true,
      person: redactPerson(result.person, { role: membership.role, tenantSettings: tenant?.settings }),
      version: result.version,
    });
  } catch (error) {
    console.error('新增家谱人物失败:', error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
