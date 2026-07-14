const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.error || `请求失败 (${response.status})`);
  return payload;
}

const openRecordingDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('puli_story_recordings', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('recordings');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export async function savePendingRecording(key, blob) {
  const db = await openRecordingDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('recordings', 'readwrite');
    transaction.objectStore('recordings').put(blob, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function deletePendingRecording(key) {
  const db = await openRecordingDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('recordings', 'readwrite');
    transaction.objectStore('recordings').delete(key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function compressPhoto(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 2 * 1024 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

class StoryService {
  createMemory(tenantId, personId, data) {
    return request(`/api/people/${encodeURIComponent(personId)}/memories`, { method: 'POST', body: JSON.stringify({ tenantId, ...data }) });
  }

  getMemory(memoryId) {
    return request(`/api/memories/${encodeURIComponent(memoryId)}`);
  }

  updateMemory(memoryId, data) {
    return request(`/api/memories/${encodeURIComponent(memoryId)}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  processMemory(memoryId, force = false) {
    return request(`/api/memories/${encodeURIComponent(memoryId)}/process`, { method: 'POST', body: JSON.stringify({ force }) });
  }

  publishMemory(memoryId, events) {
    return request(`/api/memories/${encodeURIComponent(memoryId)}/publish`, { method: 'POST', body: JSON.stringify({ events }) });
  }

  getEvents(tenantId, personId) {
    return request(`/api/people/${encodeURIComponent(personId)}/events?tenantId=${encodeURIComponent(tenantId)}`);
  }

  getMediaUrl(assetId) {
    return request(`/api/media/${encodeURIComponent(assetId)}/url`);
  }

  async uploadAsset({ tenantId, personId, memoryId, kind, file, durationSeconds }) {
    const signed = await request('/api/media/sign-upload', {
      method: 'POST',
      body: JSON.stringify({ tenantId, personId, memoryId, kind, fileName: file.name, contentType: file.type, fileSize: file.size }),
    });
    const upload = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!upload.ok) throw new Error(`${file.name} 上传失败`);
    return request(`/api/media/${signed.asset.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ durationSeconds }),
    });
  }
}

export default new StoryService();
