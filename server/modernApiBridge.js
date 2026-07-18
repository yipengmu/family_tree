const path = require("path");
const { pathToFileURL } = require("url");

const route = (modulePath, query = {}, params = {}) => ({
  modulePath,
  query,
  params,
});

/**
 * Resolve a Vercel API path to the same handler module used by production.
 * The returned query values mirror vercel.json rewrites so handlers do not
 * need a separate local-development contract.
 */
function resolveModernRoute(requestPath) {
  const pathname =
    String(requestPath || "")
      .split("?")[0]
      .replace(/\/+$/, "") || "/";
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "api") return null;

  const [, resource, id, action] = segments;
  if (resource === "health" && !id) return route("api/health.js");
  if (resource === "admin" && id === "analytics")
    return route("api/admin.js", { type: "analytics" });
  if (resource === "auth") return route("api/auth.js", id ? { type: id } : {});
  if (resource === "user" && id === "profile")
    return route("api/user.js", { type: "profile" });
  if (resource === "family-data") {
    if (!id) return route("api/family.js", { type: "data" });
    if (id === "default") return route("api/family.js", { type: "default" });
    if (id === "save") return route("api/family.js", { type: "save" });
    return route("api/family.js", { type: "data" }, { tenantId: id });
  }
  if (resource === "tenants") {
    if (!id) return route("api/tenant.js", { type: "collection" });
    if (action === "members")
      return route("api/tenant.js", { type: "members" }, { tenantId: id });
    return route("api/tenant.js", { type: "item" }, { tenantId: id });
  }
  if (resource === "invitations") {
    if (id === "accept")
      return route("api/tenant.js", { type: "accept-invitation" });
    if (!id) return route("api/tenant.js", { type: "invite" });
  }
  if (resource === "shares") {
    return route("api/share.js", { type: "manage" }, id ? { shareId: id } : {});
  }
  if (resource === "public-shares" && id) {
    return route("api/share.js", { type: "public" }, { token: id });
  }
  if (resource === "events" && id)
    return route("api/story.js", { type: "event" }, { eventId: id });
  if (resource === "memories" && id) {
    if (action === "process")
      return route(
        "api/story.js",
        { type: "memory-process" },
        { memoryId: id },
      );
    if (action === "publish")
      return route(
        "api/story.js",
        { type: "memory-publish" },
        { memoryId: id },
      );
    return route("api/story.js", { type: "memory" }, { memoryId: id });
  }
  if (resource === "people") {
    if (id && action === "events") {
      return route("api/story.js", { type: "person-events" }, { personId: id });
    }
    if (id && action === "memories") {
      return route(
        "api/story.js",
        { type: "person-memories" },
        { personId: id },
      );
    }
    if (id) return route("api/people.js", { type: "item" }, { personId: id });
    return route("api/people.js", { type: "collection" });
  }
  if (resource === "media") {
    if (id === "sign-upload")
      return route("api/media.js", { type: "sign-upload" });
    if (id && action === "complete")
      return route("api/media.js", { type: "complete" }, { assetId: id });
    if (id && action === "url")
      return route("api/media.js", { type: "url" }, { assetId: id });
  }
  if (resource === "uploads" && id === "sign")
    return route("api/media.js", { type: "upload" });
  if (
    (resource === "qwen" || resource === "tencent") &&
    (id === "ocr" || id === "image-parse")
  )
    return route("api/ocr.js");
  return null;
}

function resolveRouteHandler(routeModule) {
  let candidate = routeModule;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof candidate === "function") return candidate;
    if (!candidate || typeof candidate !== "object") break;
    candidate = candidate.default || candidate.handler;
  }
  return null;
}

function createModernApiBridge({ importer } = {}) {
  const load =
    importer ||
    (async (modulePath) => {
      const absolutePath = path.resolve(__dirname, "..", modulePath);
      const module = await import(pathToFileURL(absolutePath).href);
      const handler = resolveRouteHandler(module);
      if (!handler) {
        throw new TypeError(`${modulePath} did not export a function handler`);
      }
      return handler;
    });
  const moduleCache = new Map();

  return async function modernApiBridge(req, res, next) {
    const resolved = resolveModernRoute(req.originalUrl || req.url);
    if (!resolved) return next();

    try {
      let handler = moduleCache.get(resolved.modulePath);
      if (!handler) {
        handler = await load(resolved.modulePath);
        moduleCache.set(resolved.modulePath, handler);
      }
      const mergedQuery = {
        ...(req.query || {}),
        ...resolved.params,
        ...resolved.query,
      };
      Object.defineProperty(req, "query", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: mergedQuery,
      });
      return handler(req, res);
    } catch (error) {
      console.error("统一 API handler 加载或执行失败:", error);
      return res
        .status(500)
        .json({ success: false, error: "服务端接口暂时不可用" });
    }
  };
}

module.exports = createModernApiBridge;
module.exports.resolveModernRoute = resolveModernRoute;
