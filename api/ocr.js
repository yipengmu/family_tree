import handler from '../lib/api-handlers/tencent/ocr.js';

export default handler;

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
