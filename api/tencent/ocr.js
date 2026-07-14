import prisma from '../../lib/prisma.js';
import { authenticateRequest, sendAuthError } from '../../lib/auth.js';
import { parseFamilyTreeImage } from '../../lib/cloud/ai.js';
import { recognizeImage } from '../../lib/cloud/ocr.js';
import { requireStoryWrite } from '../../lib/personStories.js';

const normalizePerson = (item, index) => ({
  id: item.id ?? index + 1,
  name: String(item.name || '').trim(),
  g_rank: Number(item.g_rank) || 1,
  rank_index: Number(item.rank_index) || index + 1,
  g_father_id: item.g_father_id ?? 0,
  sex: item.sex === 'WOMAN' ? 'WOMAN' : 'MAN',
  adoption: item.adoption || 'none',
  official_position: item.official_position || '',
  summary: item.summary || '',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const user = authenticateRequest(req);
    const { tenantId, imageUrls } = req.body || {};
    await requireStoryWrite(prisma, user.userId, tenantId);
    if (!Array.isArray(imageUrls) || !imageUrls.length || imageUrls.length > 10) return res.status(400).json({ success: false, error: '请上传 1 至 10 张家谱图片' });

    const people = [];
    const rawResults = [];
    for (const imageUrl of imageUrls) {
      const ocr = await recognizeImage(imageUrl);
      const parsed = await parseFamilyTreeImage({ imageUrl, ocrText: ocr.text });
      const candidates = Array.isArray(parsed.data?.people) ? parsed.data.people : [];
      const offset = people.length;
      people.push(...candidates.map((item, index) => normalizePerson(item, offset + index)));
      rawResults.push({ ocr, parsed: parsed.data });
    }
    const job = await prisma.aiProcessingJob.create({
      data: {
        tenant_id: tenantId,
        kind: 'OCR_IMPORT',
        status: 'SUCCEEDED',
        input_snapshot: JSON.stringify({ imageCount: imageUrls.length }),
        output_snapshot: JSON.stringify(rawResults),
        attempts: 1,
      },
    });
    return res.json({ success: true, data: people.filter((person) => person.name), count: people.length, jobId: job.id, rawOcr: rawResults.map((item) => item.ocr) });
  } catch (error) {
    console.error('腾讯云家谱图片识别失败:', error);
    return sendAuthError(res, error);
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
