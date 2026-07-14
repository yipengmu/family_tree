import { createTypedRouter } from '../lib/apiRouter.js';

const routes = {
  collection: () => import('../lib/api-handlers/tenants.js'),
  item: () => import('../lib/api-handlers/tenants/[tenantId].js'),
  members: () => import('../lib/api-handlers/tenants/[tenantId]/members.js'),
  invite: () => import('../lib/api-handlers/invitations/index.js'),
  'accept-invitation': () => import('../lib/api-handlers/invitations/accept.js'),
};

export default createTypedRouter(routes, {
  defaultType: 'collection',
  notFoundMessage: 'Tenant endpoint not found',
});

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
