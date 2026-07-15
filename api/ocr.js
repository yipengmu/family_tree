// Keep this consolidated Vercel function name for backwards-compatible rewrites.
// The implementation uses Tencent TokenHub multimodal parsing, not traditional OCR.
import handler from '../lib/api-handlers/tencent/image-parse.js';

export default handler;

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
