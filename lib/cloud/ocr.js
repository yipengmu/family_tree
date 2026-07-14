import tencentcloud from 'tencentcloud-sdk-nodejs-ocr';
import { getTencentCredential } from './config.js';

let cachedClient;

function getClient() {
  if (cachedClient) return cachedClient;
  const credential = getTencentCredential();
  const Client = tencentcloud.ocr.v20181119.Client;
  cachedClient = new Client({
    credential,
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com' } },
  });
  return cachedClient;
}

export async function recognizeImage(imageUrl) {
  const response = await getClient().GeneralAccurateOCR({ ImageUrl: imageUrl });
  const detections = (response.TextDetections || []).map((item) => ({
    text: item.DetectedText,
    confidence: item.Confidence,
    polygon: item.Polygon || null,
    itemPolygon: item.ItemPolygon || null,
  }));
  return {
    text: detections.map((item) => item.text).join('\n'),
    detections,
    requestId: response.RequestId,
  };
}
