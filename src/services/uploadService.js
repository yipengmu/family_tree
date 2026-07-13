/**
 * 媒体上传服务。
 * 浏览器只获取一次性签名地址，长期 OSS 密钥始终留在服务端。
 */
class UploadService {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024;
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    this.ossClient = null; // 兼容旧诊断页；生产端不再初始化浏览器 OSS SDK。
  }

  validateFiles(files) {
    const errors = [];
    if (!files?.length) errors.push('请选择要上传的图片');
    if (files?.length > 10) errors.push('一次最多上传 10 张图片');
    (files || []).forEach((file) => {
      if (!this.allowedTypes.includes(file.type)) errors.push(`${file.name} 不是支持的图片格式`);
      if (file.size > this.maxFileSize) errors.push(`${file.name} 超过 10MB`);
    });
    return { isValid: errors.length === 0, errors };
  }

  async uploadFiles(files, tenantId, options = {}) {
    const validation = this.validateFiles(files);
    if (!validation.isValid) throw new Error(validation.errors.join('；'));
    if (!tenantId || tenantId === 'default') throw new Error('示范家谱不支持上传图片');

    const token = localStorage.getItem('token');
    if (!token) throw new Error('请登录后上传图片');

    const results = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const signedResponse = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId, fileName: file.name, contentType: file.type, fileSize: file.size }),
      });
      const signed = await signedResponse.json();
      if (!signedResponse.ok || !signed.success) throw new Error(signed.error || '无法获取安全上传地址');

      const uploadResponse = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error(`${file.name} 上传失败`);

      options.onProgress?.(index, 100, file.name);
      results.push(signed.fileUrl);
    }
    return results;
  }

  isOSSConfigured() { return true; }
  getUploadConfig() {
    return {
      maxFileSize: this.maxFileSize,
      maxFileCount: 10,
      allowedTypes: this.allowedTypes,
      isOSSEnabled: true,
      uploadMethod: 'ServerSignedOSS',
    };
  }
  createPreviewUrl(file) { return URL.createObjectURL(file); }
  revokePreviewUrl(url) { URL.revokeObjectURL(url); }

  async deleteOSSFile() { throw new Error('请通过媒体管理页删除图片'); }
  async getOSSFileInfo() { throw new Error('浏览器不再直接读取 OSS 元数据'); }
  generateTempUrl() { throw new Error('临时访问地址需要由服务端生成'); }
}

export default new UploadService();
