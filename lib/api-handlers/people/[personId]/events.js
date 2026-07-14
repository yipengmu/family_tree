import prisma from '../../../prisma.js';
import { authenticateRequest, DEFAULT_TENANT_ID, sendAuthError } from '../../../auth.js';
import { canReadPrivate, requirePerson, requireStoryRead, serializeEvent } from '../../../personStories.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const tenantId = req.query.tenantId;
    if (!tenantId || tenantId === DEFAULT_TENANT_ID) return res.json({ success: true, data: [], count: 0, readOnly: true });
    const user = authenticateRequest(req);
    await requireStoryRead(prisma, user.userId, tenantId);
    await requirePerson(prisma, tenantId, req.query.personId);
    const events = await prisma.event.findMany({
      where: { tenant_id: tenantId, person_id: String(req.query.personId), deleted_at: null, status: { in: ['PUBLISHED', 'DISPUTED'] } },
      include: {
        creator: true,
        sources: { include: { memory: { include: { assets: true } } } },
        revisions: { include: { actor: true }, orderBy: { created_at: 'desc' }, take: 10 },
      },
      orderBy: [{ sort_year: 'asc' }, { published_at: 'asc' }],
    });
    const visible = events.filter((event) => canReadPrivate(event, user.userId)).map(serializeEvent);
    return res.json({ success: true, data: visible, count: visible.length });
  } catch (error) {
    console.error('读取人物纪事失败:', error);
    return sendAuthError(res, error);
  }
}
