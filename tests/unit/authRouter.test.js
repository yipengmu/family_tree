const test = require("node:test");
const assert = require("node:assert/strict");

async function loadAuthRouter() {
  const module = await import("../../api/auth.js");
  return module.default;
}

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    setHeader() {
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

test("auth Vercel entry resolves the nested handler module to a function", async () => {
  const router = await loadAuthRouter();
  const response = createResponse();

  await router(
    { method: "GET", query: { type: "unknown" }, headers: {} },
    response,
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.payload, {
    success: false,
    error: "Auth endpoint not found",
  });
});

test("auth Vercel entry dispatches requests without routeHandler type errors", async () => {
  const router = await loadAuthRouter();
  const response = createResponse();

  await router(
    { method: "POST", query: { type: "login" }, headers: {}, body: {} },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload, {
    success: false,
    error: "请输入有效的手机号或邮箱及密码",
  });
});

test("normal phone login requires a password and never dispatches an SMS code", async () => {
  const router = await loadAuthRouter();
  const response = createResponse();

  await router(
    {
      method: "POST",
      query: { type: "login" },
      headers: {},
      body: { account: "13800138000" },
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.error, "请输入有效的手机号或邮箱及密码");
});

test("auth Vercel entry exposes the password reset action", async () => {
  const router = await loadAuthRouter();
  const response = createResponse();

  await router(
    {
      method: "POST",
      query: { type: "reset-password" },
      headers: {},
      body: {},
    },
    response,
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.success, false);
});
