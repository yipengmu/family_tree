const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const projectRoot = path.resolve(__dirname, "../..");

test("server API directories declare explicit ESM boundaries", () => {
  for (const directory of ["api", "lib"]) {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, directory, "package.json"), "utf8"),
    );
    assert.equal(packageJson.type, "module");
  }
});

test("the Vercel auth entry and shared auth handler run on a cold start", async () => {
  const entryUrl = pathToFileURL(path.join(projectRoot, "api/auth.js")).href;
  const handlerUrl = pathToFileURL(
    path.join(projectRoot, "lib/api-handlers/auth/[action].js"),
  ).href;

  const [entryModule, handlerModule] = await Promise.all([
    import(entryUrl),
    import(handlerUrl),
  ]);

  assert.equal(typeof entryModule.default, "function");
  assert.equal(typeof handlerModule.default, "function");

  const response = {
    body: null,
    statusCode: null,
    setHeader() {},
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await entryModule.default(
    {
      method: "POST",
      query: { type: "phone-send-code" },
      headers: {},
      body: { phone: "invalid" },
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, "请输入有效的手机号");
});
