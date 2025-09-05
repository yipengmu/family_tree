/**
 * 文件上传服务 - 使用阿里云OSS SDK
 */

import OSS from 'ali-oss';

class UploadService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL;
    this.uploadEndpoint = process.env.REACT_APP_UPLOAD_ENDPOINT || '/api/upload';

    // OSS配置
    this.ossConfig = {
      region: process.env.REACT_APP_OSS_REGION,
      bucket: process.env.REACT_APP_OSS_BUCKET,
      accessKeyId: process.env.REACT_APP_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.REACT_APP_OSS_ACCESS_KEY_SECRET,
      endpoint: process.env.REACT_APP_OSS_ENDPOINT,
      secure: true, // 使用HTTPS
    };

    // 文件限制
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    // 初始化OSS客户端
    this.ossClient = null;
    this.initOSSClient();
  }

  /**
   * 初始化OSS客户端
   */
  initOSSClient() {
    try {
      if (this.isOSSConfigured()) {
        console.log('初始化OSS客户端...');
        const ossConfig = {
          region: this.ossConfig.region,
          bucket: this.ossConfig.bucket,
          accessKeyId: this.ossConfig.accessKeyId,
          accessKeySecret: this.ossConfig.accessKeySecret,
          endpoint: this.ossConfig.endpoint,
          secure: this.ossConfig.secure,
        };
        this.ossClient = new OSS(ossConfig);
        console.log('✅ OSS客户端初始化成功', this.ossClient);
      } else {
        console.log('⚠️ OSS配置不完整，将使用模拟上传');
      }
    } catch (error) {
      console.error('❌ OSS客户端初始化失败:', error);
      this.ossClient = null;
    }
  }

  /**
   * 上传文件到OSS或后端服务器
   * @param {Array<File>} files - 文件数组
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 上传选项
   * @returns {Promise<Array<string>>} - 上传后的文件URL数组
   */
  async uploadFiles(files, tenantId = 'default', options = {}) {
    try {
      console.log('📤 开始上传文件，数量:', files.length);
      
      // 验证文件
      const validationResult = this.validateFiles(files);
      if (!validationResult.isValid) {
        throw new Error(`文件验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 如果配置了OSS，优先使用OSS上传
      if (this.isOSSConfigured()) {
        return await this.uploadToOSS(files, tenantId, options);
      } else {
        // 否则上传到后端服务器
        return await this.uploadToServer(files, tenantId, options);
      }
    } catch (error) {
      console.error('❌ 文件上传失败:', error);
      throw error;
    }
  }

  /**
   * 上传文件到OSS（使用阿里云OSS SDK）
   * @param {Array<File>} files - 文件数组
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 上传选项
   * @returns {Promise<Array<string>>} - 上传后的文件URL数组
   */
  async uploadToOSS(files, tenantId, options = {}) {
    if (!this.ossClient) {
      throw new Error('OSS客户端未初始化，请检查OSS配置');
    }

    const uploadPromises = files.map(async (file, index) => {
      try {
        // 生成唯一文件名和路径
        const fileName = this.generateFileName(file, tenantId, index);
        const objectKey = `family-tree/${tenantId}/${fileName}`;

        console.log(`📤 开始上传文件: ${file.name} -> ${objectKey}`);

        // 使用OSS SDK上传文件
        const result = await this.ossClient.put(objectKey, file, {
          headers: {
            'Content-Type': file.type,
            'Cache-Control': 'public, max-age=31536000', // 缓存1年
          },
          // 上传进度回调
          progress: (p, checkpoint) => {
            const percent = Math.round(p * 100);
            console.log(`📊 ${file.name} 上传进度: ${percent}%`);

            // 触发进度事件（如果有回调）
            if (options.onProgress) {
              options.onProgress(index, percent, file.name);
            }
          },
        });

        // 获取文件的公网访问URL
        const fileUrl = this.ossClient.generateObjectUrl(objectKey);

        console.log(`✅ 文件上传成功: ${file.name}`);
        console.log(`🔗 访问URL: ${fileUrl}`);

        return fileUrl;
      } catch (error) {
        console.error(`❌ 文件上传失败 (${file.name}):`, error);

        // 如果是OSS错误，提供更详细的错误信息
        if (error.code) {
          throw new Error(`OSS上传失败 [${error.code}]: ${error.message}`);
        }

        throw error;
      }
    });

    try {
      const urls = await Promise.all(uploadPromises);
      console.log('🎉 所有文件上传完成，URL数量:', urls.length);
      return urls;
    } catch (error) {
      console.error('❌ 批量上传失败:', error);
      throw error;
    }
  }

  /**
   * 上传文件到后端服务器
   * @param {Array<File>} files - 文件数组
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 上传选项
   * @returns {Promise<Array<string>>} - 上传后的文件URL数组
   */
  async uploadToServer(files, tenantId, options = {}) {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    formData.append('tenantId', tenantId);
    formData.append('uploadType', 'family_tree_images');

    const response = await fetch(`${this.baseURL}${this.uploadEndpoint}`, {
      method: 'POST',
      headers: {
        'X-Tenant-ID': tenantId,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`服务器上传失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '上传失败');
    }

    console.log('🎉 文件上传到服务器完成，URL数量:', result.urls?.length || 0);
    return result.urls || [];
  }

  /**
   * 验证文件
   * @param {Array<File>} files - 文件数组
   * @returns {Object} - 验证结果
   */
  validateFiles(files) {
    const errors = [];

    if (!files || files.length === 0) {
      errors.push('请选择要上传的文件');
      return { isValid: false, errors };
    }

    if (files.length > 10) {
      errors.push('最多只能上传10个文件');
    }

    files.forEach((file, index) => {
      // 检查文件类型
      if (!this.allowedTypes.includes(file.type)) {
        errors.push(`文件 ${index + 1} (${file.name}) 类型不支持，仅支持图片格式`);
      }

      // 检查文件大小
      if (file.size > this.maxFileSize) {
        errors.push(`文件 ${index + 1} (${file.name}) 大小超过限制 (${this.formatFileSize(this.maxFileSize)})`);
      }

      // 检查文件名
      if (file.name.length > 100) {
        errors.push(`文件 ${index + 1} 名称过长`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 生成唯一文件名
   * @param {File} file - 文件对象
   * @param {string} tenantId - 租户ID
   * @param {number} index - 文件索引
   * @returns {string} - 生成的文件名
   */
  generateFileName(file, tenantId, index) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    return `${timestamp}_${random}_${index}.${extension}`;
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} - 格式化后的大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查OSS是否已配置
   * @returns {boolean} - 是否已配置OSS
   */
  isOSSConfigured() {
    // 检查所有必需的OSS配置项是否已提供
    console.log('OSS配置:', this.ossConfig);
    return !!(
      this.ossConfig.region &&
      this.ossConfig.bucket &&
      this.ossConfig.accessKeyId &&
      this.ossConfig.accessKeySecret &&
      this.ossConfig.endpoint
    );
  }

  /**
   * 获取上传配置信息
   * @returns {Object} - 配置信息
   */
  getUploadConfig() {
    return {
      maxFileSize: this.maxFileSize,
      maxFileCount: 10,
      allowedTypes: this.allowedTypes,
      isOSSEnabled: this.isOSSConfigured(),
      uploadMethod: this.isOSSConfigured() ? 'OSS' : 'Server',
    };
  }

  /**
   * 创建文件预览URL
   * @param {File} file - 文件对象
   * @returns {string} - 预览URL
   */
  createPreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  /**
   * 释放预览URL
   * @param {string} url - 预览URL
   */
  revokePreviewUrl(url) {
    URL.revokeObjectURL(url);
  }

  /**
   * 删除OSS文件
   * @param {string} objectKey - OSS对象键
   * @returns {Promise<boolean>} - 是否删除成功
   */
  async deleteOSSFile(objectKey) {
    try {
      if (!this.ossClient) {
        throw new Error('OSS客户端未初始化');
      }

      await this.ossClient.delete(objectKey);
      console.log(`🗑️ 文件删除成功: ${objectKey}`);
      return true;
    } catch (error) {
      console.error(`❌ 文件删除失败 (${objectKey}):`, error);
      return false;
    }
  }

  /**
   * 批量删除OSS文件
   * @param {Array<string>} objectKeys - OSS对象键数组
   * @returns {Promise<Object>} - 删除结果
   */
  async deleteMultipleOSSFiles(objectKeys) {
    try {
      if (!this.ossClient) {
        throw new Error('OSS客户端未初始化');
      }

      const result = await this.ossClient.deleteMulti(objectKeys);
      console.log(`🗑️ 批量删除完成，成功: ${result.deleted?.length || 0}, 失败: ${result.failed?.length || 0}`);
      return result;
    } catch (error) {
      console.error('❌ 批量删除失败:', error);
      throw error;
    }
  }

  /**
   * 获取OSS文件信息
   * @param {string} objectKey - OSS对象键
   * @returns {Promise<Object>} - 文件信息
   */
  async getOSSFileInfo(objectKey) {
    try {
      if (!this.ossClient) {
        throw new Error('OSS客户端未初始化');
      }

      const result = await this.ossClient.head(objectKey);
      return {
        size: result.res.headers['content-length'],
        type: result.res.headers['content-type'],
        lastModified: result.res.headers['last-modified'],
        etag: result.res.headers.etag,
      };
    } catch (error) {
      console.error(`❌ 获取文件信息失败 (${objectKey}):`, error);
      throw error;
    }
  }

  /**
   * 生成OSS文件的临时访问URL
   * @param {string} objectKey - OSS对象键
   * @param {number} expires - 过期时间（秒），默认1小时
   * @returns {string} - 临时访问URL
   */
  generateTempUrl(objectKey, expires = 3600) {
    try {
      if (!this.ossClient) {
        throw new Error('OSS客户端未初始化');
      }

      const url = this.ossClient.signatureUrl(objectKey, {
        expires,
        method: 'GET',
      });

      console.log(`🔗 生成临时URL: ${objectKey} (有效期: ${expires}秒)`);
      return url;
    } catch (error) {
      console.error(`❌ 生成临时URL失败 (${objectKey}):`, error);
      throw error;
    }
  }

  /**
   * 列出租户的所有文件
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} - 文件列表
   */
  async listTenantFiles(tenantId, options = {}) {
    try {
      if (!this.ossClient) {
        throw new Error('OSS客户端未初始化');
      }

      const prefix = `family-tree/${tenantId}/`;
      const result = await this.ossClient.list({
        prefix,
        'max-keys': options.maxKeys || 100,
        marker: options.marker || '',
      });

      const files = result.objects?.map(obj => ({
        key: obj.name,
        url: this.ossClient.generateObjectUrl(obj.name),
        size: obj.size,
        lastModified: obj.lastModified,
        etag: obj.etag,
      })) || [];

      console.log(`📋 租户 ${tenantId} 的文件列表: ${files.length} 个文件`);
      return files;
    } catch (error) {
      console.error(`❌ 获取文件列表失败 (租户: ${tenantId}):`, error);
      throw error;
    }
  }
}

// 创建单例实例
const uploadService = new UploadService();

export default uploadService;
