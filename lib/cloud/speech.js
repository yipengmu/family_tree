import tencentcloud from 'tencentcloud-sdk-nodejs-asr';
import { getAsrConfig } from './config.js';

let cachedClient;

function getClient() {
  if (cachedClient) return cachedClient;
  const config = getAsrConfig();
  const Client = tencentcloud.asr.v20190614.Client;
  cachedClient = new Client({
    credential: { secretId: config.secretId, secretKey: config.secretKey },
    region: config.region,
    profile: { httpProfile: { endpoint: 'asr.tencentcloudapi.com' } },
  });
  return cachedClient;
}

export async function createTranscriptionTask(audioUrl) {
  const config = getAsrConfig();
  const response = await getClient().CreateRecTask({
    EngineModelType: config.engineModelType,
    ChannelNum: 1,
    ResTextFormat: 3,
    SourceType: 0,
    Url: audioUrl,
    FilterDirty: 0,
    FilterModal: 0,
    ConvertNumMode: 1,
  });
  return { taskId: String(response.Data.TaskId), raw: response };
}

export async function getTranscriptionTask(taskId) {
  const response = await getClient().DescribeTaskStatus({ TaskId: Number(taskId) });
  const data = response.Data || {};
  const statusMap = { 0: 'PENDING', 1: 'PROCESSING', 2: 'SUCCEEDED', 3: 'FAILED' };
  return {
    status: statusMap[data.Status] || 'FAILED',
    transcript: data.Result || null,
    details: data.ResultDetail || null,
    durationSeconds: data.AudioDuration || null,
    error: data.ErrorMsg || null,
    raw: response,
  };
}
