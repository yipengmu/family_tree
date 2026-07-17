const test = require("node:test");
const assert = require("node:assert/strict");

const Dypnsapi = require("@alicloud/dypnsapi20170525");
const DypnsapiClient = Dypnsapi.default;

function withAliyunEnv(fn) {
  const previous = {
    ALIBABA_CLOUD_ACCESS_KEY_ID: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    ALIBABA_CLOUD_ACCESS_KEY_SECRET:
      process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    ALIBABA_CLOUD_REGION_ID: process.env.ALIBABA_CLOUD_REGION_ID,
    ALIBABA_CLOUD_ENDPOINT: process.env.ALIBABA_CLOUD_ENDPOINT,
    ALIBABA_PNVS_SCHEME_NAME: process.env.ALIBABA_PNVS_SCHEME_NAME,
    ALIBABA_PNVS_SIGN_NAME: process.env.ALIBABA_PNVS_SIGN_NAME,
    ALIBABA_PNVS_TEMPLATE_CODE: process.env.ALIBABA_PNVS_TEMPLATE_CODE,
  };

  Object.assign(process.env, {
    ALIBABA_CLOUD_ACCESS_KEY_ID: "test-access-key-id",
    ALIBABA_CLOUD_ACCESS_KEY_SECRET: "test-access-key-secret",
    ALIBABA_CLOUD_REGION_ID: "cn-hangzhou",
    ALIBABA_CLOUD_ENDPOINT: "dypnsapi.aliyuncs.com",
    ALIBABA_PNVS_SCHEME_NAME: "默认方案",
    ALIBABA_PNVS_SIGN_NAME: "恒创联众",
    ALIBABA_PNVS_TEMPLATE_CODE: "100001",
  });

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      delete globalThis.__puliAliyunSmsAuthClient;
    });
}

test("Aliyun SMS auth uses the package default export as the client class", async () => {
  await withAliyunEnv(async () => {
    const originalSend = DypnsapiClient.prototype.sendSmsVerifyCodeWithOptions;
    const originalCheck = DypnsapiClient.prototype.checkSmsVerifyCodeWithOptions;
    const calls = [];

    DypnsapiClient.prototype.sendSmsVerifyCodeWithOptions = async function (
      request,
      runtime,
    ) {
      calls.push({ method: "send", request, runtime });
      return { body: { success: true, code: "OK" } };
    };
    DypnsapiClient.prototype.checkSmsVerifyCodeWithOptions = async function (
      request,
      runtime,
    ) {
      calls.push({ method: "check", request, runtime });
      return { body: { success: true, model: { verifyResult: "PASS" } } };
    };

    try {
      const smsAuth = await import("../../lib/aliyunSmsAuth.js");

      assert.equal(smsAuth.isAliyunSmsAuthConfigured(), true);
      await smsAuth.sendSmsVerifyCode({
        phoneNumber: "13800138000",
        outId: "test-out-id",
      });
      await smsAuth.checkSmsVerifyCode({
        phoneNumber: "13800138000",
        verifyCode: "123456",
        outId: "test-out-id",
      });
    } finally {
      DypnsapiClient.prototype.sendSmsVerifyCodeWithOptions = originalSend;
      DypnsapiClient.prototype.checkSmsVerifyCodeWithOptions = originalCheck;
    }

    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, "send");
    assert.equal(calls[0].request.phoneNumber, "13800138000");
    assert.equal(calls[0].request.schemeName, "默认方案");
    assert.equal(calls[0].request.signName, "恒创联众");
    assert.equal(calls[0].request.templateCode, "100001");
    assert.equal(calls[0].request.validTime, 300);
    assert.deepEqual(calls[0].runtime, {});
    assert.equal(calls[1].method, "check");
    assert.equal(calls[1].request.schemeName, "默认方案");
    assert.equal(calls[1].request.verifyCode, "123456");
  });
});
