import { resolveRouteHandler } from '../lib/apiRouter.js';

let routeHandler;

export default async function authRouter(req, res) {
  req.query = { ...(req.query || {}), action: req.query?.type || req.query?.action };
  if (!routeHandler) {
    const routeModule = await import('../lib/api-handlers/auth/[action].js');
    routeHandler = resolveRouteHandler(routeModule);
    if (!routeHandler) {
      throw new TypeError('Auth route did not export a function handler');
    }
  }
  return routeHandler(req, res);
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
