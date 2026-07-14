import { createTypedRouter } from '../lib/apiRouter.js';

const routes = {
  'sign-upload': () => import('../lib/api-handlers/media/sign-upload.js'),
  complete: () => import('../lib/api-handlers/media/[assetId]/complete.js'),
  url: () => import('../lib/api-handlers/media/[assetId]/url.js'),
  upload: () => import('../lib/api-handlers/uploads/sign.js'),
};

export default createTypedRouter(routes, {
  defaultType: 'sign-upload',
  notFoundMessage: 'Media endpoint not found',
});

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
