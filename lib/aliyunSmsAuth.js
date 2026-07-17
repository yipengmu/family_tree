import { Config } from '@alicloud/openapi-client';
import * as Dypnsapi from '@alicloud/dypnsapi20170525';

const globalState = globalThis;

function getDypnsapiClientClass() {
  if (typeof Dypnsapi.Client === 'function') return Dypnsapi.Client;
  if (typeof Dypnsapi.default === 'function') return Dypnsapi.default;
  if (typeof Dypnsapi.default?.Client === 'function') {
    return Dypnsapi.default.Client;
  }
  return Dypnsapi.default?.default;
}

function getConfig() {
  return {
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    regionId: process.env.ALIBABA_CLOUD_REGION_ID || 'cn-hangzhou',
    endpoint: process.env.ALIBABA_CLOUD_ENDPOINT || 'dypnsapi.aliyuncs.com',
    schemeName: process.env.ALIBABA_PNVS_SCHEME_NAME || undefined,
    signName: process.env.ALIBABA_PNVS_SIGN_NAME,
    templateCode: process.env.ALIBABA_PNVS_TEMPLATE_CODE,
  };
}

export function isAliyunSmsAuthConfigured() {
  const config = getConfig();
  return Boolean(
    config.accessKeyId &&
      config.accessKeySecret &&
      config.signName &&
      config.templateCode,
  );
}

function getClient() {
  if (!isAliyunSmsAuthConfigured()) {
    throw new Error('阿里云短信认证服务未配置');
  }
  if (!globalState.__puliAliyunSmsAuthClient) {
    const config = getConfig();
    const Client = getDypnsapiClientClass();
    globalState.__puliAliyunSmsAuthClient = new Client(new Config(config));
  }
  return globalState.__puliAliyunSmsAuthClient;
}

export async function sendSmsVerifyCode({ phoneNumber, outId }) {
  const client = getClient();
  const request = new Dypnsapi.SendSmsVerifyCodeRequest({
    countryCode: '86',
    phoneNumber,
    schemeName: getConfig().schemeName,
    signName: getConfig().signName,
    templateCode: getConfig().templateCode,
    templateParam: JSON.stringify({ code: '##code##', min: '5' }),
    codeType: 1,
    codeLength: 6,
    validTime: 5,
    interval: 60,
    duplicatePolicy: 1,
    outId,
  });
  return client.sendSmsVerifyCodeWithOptions(request, {});
}

export async function checkSmsVerifyCode({ phoneNumber, verifyCode, outId }) {
  const client = getClient();
  const request = new Dypnsapi.CheckSmsVerifyCodeRequest({
    countryCode: '86',
    phoneNumber,
    verifyCode,
    outId,
  });
  return client.checkSmsVerifyCodeWithOptions(request, {});
}
