import { createTypedRouter } from '../lib/apiRouter.js';

const routes = {
  profile: () => import('../lib/api-handlers/user/profile.js'),
};

export default createTypedRouter(routes, {
  defaultType: 'profile',
  notFoundMessage: 'User endpoint not found',
});

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
