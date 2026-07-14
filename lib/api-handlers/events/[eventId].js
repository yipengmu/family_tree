import prisma from '../../prisma.js';
import { authenticateRequest, sendAuthError } from '../../auth.js';
import { assertDatePrecision, assertVisibility, canMutateContribution, createAuditLog, deriveSortYear, eventSnapshot, requireStoryWrite, serializeEvent } from '../../personStories.js';

export default async function handler(req, res) {
  if (!['PATCH', 'DELETE'].includes(req.method)) return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const user = authenticateRequest(req);
    const event = await prisma.event.findUnique({ where: { id: req.query.eventId } });
    if (!event || event.deleted_at) return res.status(404).json({ success: false, error: '纪事不存在' });
    const membership = await requireStoryWrite(prisma, user.userId, event.tenant_id);
    if (!canMutateContribution(event, membership, user.userId)) return res.status(403).json({ success: false, error: '无权修改此纪事' });

    if (req.method === 'DELETE') {
      const deletedAt = new Date();
      await prisma.$transaction([
        prisma.eventRevision.create({ data: { event_id: event.id, actor_user_id: Number(user.userId), action: 'DELETE', snapshot: eventSnapshot(event) } }),
        prisma.event.update({ where: { id: event.id }, data: { deleted_at: deletedAt, status: 'ARCHIVED', updated_by: Number(user.userId) } }),
      ]);
      await createAuditLog(prisma, { tenantId: event.tenant_id, actorUserId: user.userId, action: 'DELETE', entityType: 'EVENT', entityId: event.id, metadata: { recoverableUntil: new Date(deletedAt.getTime() + 30 * 86400000).toISOString() } });
      return res.json({ success: true, recoverableUntil: new Date(deletedAt.getTime() + 30 * 86400000) });
    }

    const body = req.body || {};
    const updated = await prisma.$transaction(async (tx) => {
      await tx.eventRevision.create({ data: { event_id: event.id, actor_user_id: Number(user.userId), action: 'UPDATE', snapshot: eventSnapshot(event) } });
      return tx.event.update({
        where: { id: event.id },
        data: {
          title: body.title === undefined ? event.title : String(body.title || '').trim().slice(0, 120),
          narrative: body.narrative === undefined ? event.narrative : String(body.narrative || '').trim().slice(0, 10000),
          event_type: body.eventType === undefined ? event.event_type : String(body.eventType || 'OTHER').toUpperCase().slice(0, 40),
          time_text: body.timeText === undefined ? event.time_text : String(body.timeText || '').slice(0, 100) || null,
          sort_year: body.sortYear === undefined ? (body.timeText === undefined ? event.sort_year : deriveSortYear(body.timeText)) : Number(body.sortYear) || null,
          date_precision: body.datePrecision === undefined ? event.date_precision : assertDatePrecision(body.datePrecision),
          location: body.location === undefined ? event.location : String(body.location || '').slice(0, 200) || null,
          is_highlight: body.isHighlight === undefined ? event.is_highlight : body.isHighlight === true,
          visibility: body.visibility === undefined ? event.visibility : assertVisibility(body.visibility),
          updated_by: Number(user.userId),
        },
        include: { creator: true, sources: { include: { memory: { include: { assets: true } } } }, revisions: { include: { actor: true }, orderBy: { created_at: 'desc' }, take: 10 } },
      });
    });
    await createAuditLog(prisma, { tenantId: event.tenant_id, actorUserId: user.userId, action: 'UPDATE', entityType: 'EVENT', entityId: event.id });
    return res.json({ success: true, event: serializeEvent(updated) });
  } catch (error) {
    console.error('修改人物纪事失败:', error);
    return sendAuthError(res, error);
  }
}
