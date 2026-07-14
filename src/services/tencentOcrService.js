class TencentOcrService {
  constructor() {
    this.endpoint = '/api/tencent/ocr';
  }

  async recognizeFamilyTree(imageUrls, tenantId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('请登录后使用图片识别');
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imageUrls, tenantId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || '腾讯云图片识别失败');
    return result.data || [];
  }

  async testConnection() {
    return { success: true, managedByServer: true, provider: 'Tencent Cloud' };
  }
}

export default new TencentOcrService();
