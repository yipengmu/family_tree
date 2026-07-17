import { createTypedRouter } from '../lib/apiRouter.js';

const routes = {
  analytics: () => import('../lib/api-handlers/admin/analytics.js'),
  'fix-phone-identity': () => import('../lib/api-handlers/admin/fix-phone-identity.js'),
};

export default createTypedRouter(routes, {
  defaultType: 'analytics',
  notFoundMessage: 'Admin endpoint not found',
});

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
