const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const createModernApiBridge = require("../../server/modernApiBridge");

function listApiFunctions(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listApiFunctions(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

test("keeps Vercel serverless function count within Hobby limit", () => {
  const apiDir = path.resolve(__dirname, "../../api");
  const functions = listApiFunctions(apiDir)
    .map((file) => path.relative(apiDir, file))
    .sort();

  assert.equal(
    functions.length <= 12,
    true,
    `api has ${functions.length} functions: ${functions.join(", ")}`,
  );
});

test("typed API router loads only the requested route and caches it", async () => {
  const { createTypedRouter } = await import("../../lib/apiRouter.js");
  const loaded = [];
  const router = createTypedRouter(
    {
      fast: async () => {
        loaded.push("fast");
        return { default: (req, res) => res.json({ type: req.query.type }) };
      },
      slow: async () => {
        loaded.push("slow");
        return { default: (req, res) => res.json({ type: req.query.type }) };
      },
      nested: async () => {
        loaded.push("nested");
        return {
          default: {
            default: (req, res) => res.json({ type: req.query.type }),
          },
        };
      },
    },
    { defaultType: "fast", notFoundMessage: "missing" },
  );
  const responses = [];
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      responses.push({ code: this.code || 200, payload });
      this.code = undefined;
    },
  };

  await router({ query: {} }, res);
  await router({ query: { type: "fast" } }, res);
  await router({ query: { type: "nested" } }, res);
  await router({ query: { type: "missing" } }, res);

  assert.deepEqual(loaded, ["fast", "nested"]);
  assert.deepEqual(responses, [
    { code: 200, payload: { type: undefined } },
    { code: 200, payload: { type: "fast" } },
    { code: 200, payload: { type: "nested" } },
    { code: 404, payload: { success: false, error: "missing" } },
  ]);
});

test("maps Vercel-style media paths to the shared media handler", () => {
  assert.deepEqual(
    createModernApiBridge.resolveModernRoute("/api/media/a-1/complete"),
    {
      modulePath: "api/media.js",
      query: { type: "complete" },
      params: { assetId: "a-1" },
    },
  );
});

test("maps the API health path to the shared health handler", () => {
  assert.deepEqual(
    createModernApiBridge.resolveModernRoute("/api/health"),
    {
      modulePath: "api/health.js",
      query: {},
      params: {},
    },
  );
});

test("maps story routes and preserves route parameters", () => {
  assert.deepEqual(
    createModernApiBridge.resolveModernRoute(
      "/api/people/p-1/events?tenantId=t-1",
    ),
    {
      modulePath: "api/story.js",
      query: { type: "person-events" },
      params: { personId: "p-1" },
    },
  );
});

test("maps legacy tenant-specific family data paths", () => {
  assert.deepEqual(
    createModernApiBridge.resolveModernRoute("/api/family-data/tenant-1"),
    {
      modulePath: "api/family.js",
      query: { type: "data" },
      params: { tenantId: "tenant-1" },
    },
  );
});

test("maps person collection and item paths without stealing story routes", () => {
  assert.deepEqual(
    createModernApiBridge.resolveModernRoute("/api/people"),
    { modulePath: "api/people.js", query: { type: "collection" }, params: {} },
  );
  assert.deepEqual(
    createModernApiBridge.resolveModernRoute("/api/people/p-1"),
    { modulePath: "api/people.js", query: { type: "item" }, params: { personId: "p-1" } },
  );
  assert.equal(
    createModernApiBridge.resolveModernRoute("/api/people/p-1/events").modulePath,
    "api/story.js",
  );
});

test("bridge loads a handler once and passes rewrite query values", async () => {
  const loaded = [];
  const bridge = createModernApiBridge({
    importer: async (modulePath) => {
      loaded.push(modulePath);
      return (req, res) => res.json({ path: req.query });
    },
  });
  const response = [];
  const req = {
    originalUrl: "/api/media/sign-upload",
    url: "/api/media/sign-upload",
    query: { tenantId: "t-1" },
  };
  const res = { json: (payload) => response.push(payload) };
  const next = () => {
    throw new Error("route should have matched");
  };

  await bridge(req, res, next);
  await bridge({ ...req, query: { tenantId: "t-2" } }, res, next);
  assert.deepEqual(loaded, ["api/media.js"]);
  assert.deepEqual(response, [
    { path: { tenantId: "t-1", type: "sign-upload" } },
    { path: { tenantId: "t-2", type: "sign-upload" } },
  ]);
});
