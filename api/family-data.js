import familyData from './data/familyData.json';
import prisma from '../lib/prisma.js';
import { authenticateRequest, DEFAULT_TENANT_ID, requireTenantRole, sendAuthError } from '../lib/auth.js';
import { getCurrentVersion, redactLivingPerson, replaceFamilyData, toClientPerson } from '../lib/familyData.js';

const READ_ROLES = ['OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'];
const WRITE_ROLES = ['OWNER', 'EDITOR'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const tenantId = req.headers['x-tenant-id'] || req.body?.tenantId || DEFAULT_TENANT_ID;

  try {
    if (req.method === 'GET') {
      if (tenantId === DEFAULT_TENANT_ID) {
        return res.json({ success: true, data: familyData, count: familyData.length, version: 0, readOnly: true });
      }

      const user = authenticateRequest(req);
      const membership = await requireTenantRole(prisma, user.userId, tenantId, READ_ROLES);
      const [records, version] = await Promise.all([
        prisma.familyData.findMany({ where: { tenant_id: tenantId }, orderBy: [{ g_rank: 'asc' }, { rank_index: 'asc' }] }),
        getCurrentVersion(prisma, tenantId),
      ]);
      const data = records.map(toClientPerson).map((person) => redactLivingPerson(person, membership.role));
      return res.json({ success: true, data, count: data.length, version, readOnly: false });
    }

    if (req.method === 'POST') {
      const user = authenticateRequest(req);
      await requireTenantRole(prisma, user.userId, tenantId, WRITE_ROLES);
      const { familyData: submittedData, expectedVersion } = req.body || {};
      if (!Array.isArray(submittedData)) return res.status(400).json({ success: false, error: '家谱数据格式错误' });

      const version = await replaceFamilyData(prisma, {
        tenantId,
        familyData: submittedData,
        expectedVersion,
        userId: user.userId,
      });
      return res.json({ success: true, message: '家谱数据保存成功', savedCount: submittedData.length, version });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('家谱数据请求失败:', error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
