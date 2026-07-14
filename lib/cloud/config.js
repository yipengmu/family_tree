import { ApiAuthError } from '../auth.js';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new ApiAuthError(503, `服务端缺少 ${name} 配置`);
  return value;
};

export function getTencentCredential() {
  return {
    secretId: required('TENCENTCLOUD_SECRET_ID'),
    secretKey: required('TENCENTCLOUD_SECRET_KEY'),
  };
}

export function getCosConfig() {
  return {
    ...getTencentCredential(),
    bucket: required('TENCENT_COS_BUCKET'),
    region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
  };
}

export function getAsrConfig() {
  return {
    ...getTencentCredential(),
    region: process.env.TENCENT_ASR_REGION || 'ap-guangzhou',
    engineModelType: process.env.TENCENT_ASR_ENGINE || '16k_zh',
  };
}

export function getTokenHubConfig() {
  return {
    apiKey: required('TENCENT_TOKENHUB_API_KEY'),
    baseUrl: (process.env.TENCENT_TOKENHUB_BASE_URL || 'https://tokenhub.tencentmaas.com/v1').replace(/\/$/, ''),
    storyModel: process.env.TENCENT_STORY_MODEL || 'hy3',
    visionModel: process.env.TENCENT_VISION_MODEL || 'hy-vision-2.0-instruct',
  };
}
