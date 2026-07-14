let routeHandler;

export default async function authRouter(req, res) {
  req.query = { ...(req.query || {}), action: req.query?.type || req.query?.action };
  if (!routeHandler) {
    const module = await import('../lib/api-handlers/auth/[action].js');
    routeHandler = module.default || module;
  }
  return routeHandler(req, res);
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
