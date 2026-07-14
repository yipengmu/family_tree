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
  if (resource === "auth" && id) return route("api/auth.js", { type: id });
  if (resource === "user" && id === "profile")
    return route("api/user.js", { type: "profile" });
  if (resource === "family-data") {
    if (!id) return route("api/family.js", { type: "data" });
    if (id === "default") return route("api/family.js", { type: "default" });
    if (id === "save") return route("api/family.js", { type: "save" });
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
  if (resource === "people" && id && action === "events") {
    return route("api/story.js", { type: "person-events" }, { personId: id });
  }
  if (resource === "people" && id && action === "memories") {
    return route("api/story.js", { type: "person-memories" }, { personId: id });
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
  if ((resource === "qwen" || resource === "tencent") && id === "ocr")
    return route("api/ocr.js");
  return null;
}

function createModernApiBridge({ importer } = {}) {
  const load =
    importer ||
    (async (modulePath) => {
      const absolutePath = path.resolve(__dirname, "..", modulePath);
      const module = await import(pathToFileURL(absolutePath).href);
      return module.default || module;
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
      req.query = {
        ...(req.query || {}),
        ...resolved.params,
        ...resolved.query,
      };
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
