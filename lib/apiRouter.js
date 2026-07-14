function firstQueryValue(value, fallback) {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

export function createTypedRouter(routes, { defaultType, notFoundMessage }) {
  const handlerCache = new Map();

  return async function typedRouter(req, res) {
    const type = firstQueryValue(req.query?.type, defaultType);
    const loadRoute = routes[type];

    if (!loadRoute) {
      return res.status(404).json({
        success: false,
        error: notFoundMessage || "API endpoint not found",
      });
    }

    let routeHandler = handlerCache.get(type);
    if (!routeHandler) {
      const routeModule = await loadRoute();
      routeHandler = routeModule.default || routeModule;
      handlerCache.set(type, routeHandler);
    }

    return routeHandler(req, res);
  };
}

export function getRouteType(req, fallback) {
  return firstQueryValue(req.query?.type, fallback);
}
