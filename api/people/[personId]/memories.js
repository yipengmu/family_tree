import prisma from '../../../lib/prisma.js';
import { authenticateRequest, sendAuthError } from '../../../lib/auth.js';
import { assertVisibility, createAuditLog, requirePerson, requireStoryWrite, serializeMemory } from '../../../lib/personStories.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const user = authenticateRequest(req);
    const { tenantId, title, rawText, visibility } = req.body || {};
    await requireStoryWrite(prisma, user.userId, tenantId);
    await requirePerson(prisma, tenantId, req.query.personId);
    const memory = await prisma.memory.create({
      data: {
        tenant_id: tenantId,
        person_id: String(req.query.personId),
        created_by: Number(user.userId),
        title: title ? String(title).trim().slice(0, 100) : null,
        raw_text: rawText ? String(rawText).trim().slice(0, 20000) : null,
        visibility: assertVisibility(visibility),
      },
      include: { assets: true, aiJobs: true, creator: true },
    });
    await createAuditLog(prisma, { tenantId, actorUserId: user.userId, action: 'CREATE', entityType: 'MEMORY', entityId: memory.id });
    return res.status(201).json({ success: true, memory: serializeMemory(memory, { includeDrafts: true }) });
  } catch (error) {
    console.error('创建人物记忆失败:', error);
    return sendAuthError(res, error);
  }
}
