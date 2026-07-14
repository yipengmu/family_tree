import prisma from '../../../prisma.js';
import { authenticateRequest, sendAuthError } from '../../../auth.js';
import { canMutateContribution, canReadPrivate, requireStoryRead, serializeMemory } from '../../../personStories.js';

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const user = authenticateRequest(req);
    const memory = await prisma.memory.findUnique({
      where: { id: req.query.memoryId },
      include: { assets: true, aiJobs: { orderBy: { created_at: 'desc' } }, creator: true },
    });
    if (!memory || memory.deleted_at) return res.status(404).json({ success: false, error: '记忆不存在' });
    const membership = await requireStoryRead(prisma, user.userId, memory.tenant_id);
    if (!canReadPrivate(memory, user.userId)) return res.status(403).json({ success: false, error: '无权读取此私密记忆' });

    if (req.method === 'PATCH') {
      if (!canMutateContribution(memory, membership, user.userId)) return res.status(403).json({ success: false, error: '无权修改此记忆' });
      const updated = await prisma.memory.update({
        where: { id: memory.id },
        data: {
          title: req.body?.title === undefined ? memory.title : String(req.body.title || '').slice(0, 100) || null,
          corrected_text: req.body?.correctedText === undefined ? memory.corrected_text : String(req.body.correctedText || '').slice(0, 30000) || null,
        },
        include: { assets: true, aiJobs: { orderBy: { created_at: 'desc' } }, creator: true },
      });
      return res.json({ success: true, memory: serializeMemory(updated, { includeDrafts: true }) });
    }
    return res.json({ success: true, memory: serializeMemory(memory, { includeDrafts: canMutateContribution(memory, membership, user.userId) }) });
  } catch (error) {
    console.error('读取人物记忆失败:', error);
    return sendAuthError(res, error);
  }
}
