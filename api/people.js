import { createTypedRouter } from '../lib/apiRouter.js';

const routes = {
  collection: () => import('../lib/api-handlers/people/index.js'),
  item: () => import('../lib/api-handlers/people/[personId].js'),
};

export default createTypedRouter(routes, {
  defaultType: 'collection',
  notFoundMessage: 'Person endpoint not found',
});

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
