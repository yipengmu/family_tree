import { createTypedRouter } from '../lib/apiRouter.js';

const routes = {
  data: () => import('../lib/api-handlers/family-data.js'),
  default: () => import('../lib/api-handlers/family-data/default.js'),
  save: () => import('../lib/api-handlers/family-data/save.js'),
};

export default createTypedRouter(routes, {
  defaultType: 'data',
  notFoundMessage: 'Family endpoint not found',
});

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
