import crypto from 'crypto';
import COS from 'cos-nodejs-sdk-v5';
import { ApiAuthError } from '../auth.js';
import { getCosConfig } from './config.js';

let cached;

function getClient() {
  const config = getCosConfig();
  if (!cached) {
    cached = {
      config,
      client: new COS({
        SecretId: config.secretId,
        SecretKey: config.secretKey,
        Protocol: 'https:',
      }),
    };
  }
  return cached;
}

function callCos(method, params) {
  const { client } = getClient();
  return new Promise((resolve, reject) => {
    client[method](params, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

export function sanitizeExtension(fileName, contentType) {
  const fromName = String(fileName || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName !== String(fileName || '').toLowerCase()) return fromName;
  const subtype = String(contentType || '').split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/g, '');
  return subtype || 'bin';
}

export function createObjectKey({ tenantId, personId, category, assetId, fileName, contentType }) {
  const extension = sanitizeExtension(fileName, contentType);
  const safeTenant = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePerson = personId ? String(personId).replace(/[^a-zA-Z0-9_-]/g, '_') : null;
  const prefix = category === 'imports'
    ? `tenants/${safeTenant}/imports`
    : `tenants/${safeTenant}/people/${safePerson}/${category}`;
  return `${prefix}/${assetId || crypto.randomUUID()}.${extension}`;
}

export async function signUpload({ objectKey, contentType, expires = 300 }) {
  const { client, config } = getClient();
  const uploadUrl = client.getObjectUrl({
    Bucket: config.bucket,
    Region: config.region,
    Key: objectKey,
    Method: 'PUT',
    Sign: true,
    Expires: expires,
    Headers: contentType ? { 'Content-Type': contentType } : undefined,
  });
  return { uploadUrl, objectKey, expiresIn: expires };
}

export async function signDownload(objectKey, expires = 300) {
  const { client, config } = getClient();
  return client.getObjectUrl({
    Bucket: config.bucket,
    Region: config.region,
    Key: objectKey,
    Method: 'GET',
    Sign: true,
    Expires: expires,
  });
}

export async function headObject(objectKey) {
  const { config } = getClient();
  try {
    return await callCos('headObject', {
      Bucket: config.bucket,
      Region: config.region,
      Key: objectKey,
    });
  } catch (error) {
    throw new ApiAuthError(error?.statusCode === 404 ? 404 : 502, '无法验证已上传的媒体文件');
  }
}

export async function putObject({ objectKey, body, contentType }) {
  const { config } = getClient();
  return callCos('putObject', {
    Bucket: config.bucket,
    Region: config.region,
    Key: objectKey,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });
}

export async function deleteObject(objectKey) {
  const { config } = getClient();
  return callCos('deleteObject', {
    Bucket: config.bucket,
    Region: config.region,
    Key: objectKey,
  });
}
