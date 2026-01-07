/**
 * 文件上传服务 - 使用阿里云OSS SDK
 */

import OSS from 'ali-oss';
import OSSConfigChecker from '../utils/ossConfigChecker.js';


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
  async initOSSClient() {
    try {
      // 使用配置检查器进行详细检查
      const configCheck = OSSConfigChecker.printConfigStatus();

      if (!configCheck.isValid) {
        console.error('❌ OSS配置验证失败，无法初始化OSS客户端');
        this.ossClient = null;
        return;
      }

      // 打印配置信息用于调试（隐藏敏感信息）
      console.log('OSS配置信息:', {
        region: this.ossConfig.region,
        bucket: this.ossConfig.bucket,
        endpoint: this.ossConfig.endpoint,
        accessKeyId: this.ossConfig.accessKeyId ? `${this.ossConfig.accessKeyId.substring(0, 8)}...` : 'undefined',
        hasSecret: !!this.ossConfig.accessKeySecret
      });

      const ossConfig = {
        region: this.ossConfig.region,
        bucket: this.ossConfig.bucket,
        accessKeyId: this.ossConfig.accessKeyId,
        accessKeySecret: this.ossConfig.accessKeySecret,
        endpoint: this.ossConfig.endpoint,
        secure: this.ossConfig.secure,
        timeout: 120000,
        agent: {
          keepAlive: true,
          keepAliveMsecs: 30000,
          maxSockets: 10,
          maxFreeSockets: 10,
          timeout: 120000,
          freeSocketTimeout: 30000,
        },
        retryDelayOptions: {
          base: 300,
        },
      };

      this.ossClient = new OSS(ossConfig);
      console.log('✅ OSS客户端初始化成功');

      await this.testOSSConnection();
    } catch (error) {
      console.error('❌ OSS客户端初始化失败:', error);
      this.ossClient = null;
    }
  }

  /**
   * 测试OSS连接
   */
  async testOSSConnection() {
    try {
      if (this.ossClient) {
        console.log('🔍 测试OSS连接...');

        // 设置较短的超时时间进行快速测试
        const testStartTime = Date.now();

        // 尝试列出bucket信息来测试连接
        const result = await Promise.race([
          this.ossClient.getBucketInfo(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('连接测试超时')), 10000)
          )
        ]);

        const testDuration = Date.now() - testStartTime;
        console.log(`✅ OSS连接测试成功 (耗时: ${testDuration}ms):`, result.bucket);

        // 如果连接时间过长，给出警告
        if (testDuration > 5000) {
          console.warn('⚠️ OSS连接较慢，上传可能会受到影响');
        }

        return { success: true, duration: testDuration };
      }
    } catch (error) {
      console.warn('⚠️ OSS连接测试失败:', error.message);

      // 提供连接失败的具体建议
      if (error.message.includes('timeout') || error.message.includes('连接测试超时')) {
        console.warn('💡 建议: 检查网络连接或尝试更换网络环境');
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * 检查网络连接和OSS可达性
   * @returns {Promise<Object>} - 连接检查结果
   */
  async checkNetworkAndOSS() {
    const results = {
      networkOk: false,
      ossReachable: false,
      suggestions: []
    };

    try {
      // 检查基本网络连接
      console.log('🌐 检查网络连接...');
      const networkTest = await Promise.race([
        fetch('https://www.aliyun.com', { method: 'HEAD', mode: 'no-cors' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('网络测试超时')), 5000)
        )
      ]);
      results.networkOk = true;
      console.log('✅ 网络连接正常');
    } catch (error) {
      console.warn('❌ 网络连接异常:', error.message);
      results.suggestions.push('检查网络连接是否正常');
    }

    try {
      // 检查OSS endpoint可达性
      console.log('🔍 检查OSS服务可达性...');
      const ossEndpoint = this.ossConfig.endpoint || `https://${this.ossConfig.region}.aliyuncs.com`;

      const ossTest = await Promise.race([
        fetch(ossEndpoint, { method: 'HEAD', mode: 'no-cors' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OSS测试超时')), 8000)
        )
      ]);
      results.ossReachable = true;
      console.log('✅ OSS服务可达');
    } catch (error) {
      console.warn('❌ OSS服务不可达:', error.message);
      results.suggestions.push('OSS服务可能暂时不可用，建议稍后重试');
      results.suggestions.push('检查是否有防火墙或代理阻止访问');
    }

    return results;
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
        // 在上传前进行快速连接检查（仅在首次上传或上次检查失败时）
        if (!this._lastConnectivityCheck ||
            Date.now() - this._lastConnectivityCheck > 300000) { // 5分钟缓存
          console.log('🔍 执行连接性检查...');
          const connectivityResult = await this.checkNetworkAndOSS();
          this._lastConnectivityCheck = Date.now();

          if (!connectivityResult.networkOk || !connectivityResult.ossReachable) {
            console.warn('⚠️ 连接性检查发现问题，但仍将尝试上传');
            if (connectivityResult.suggestions.length > 0) {
              console.warn('💡 建议:', connectivityResult.suggestions.join('; '));
            }
          }
        }

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

        // 使用OSS SDK上传文件，带重试机制
        const result = await this.uploadWithRetry(objectKey, file, {
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
        }, index, file.name);

        // 获取文件的公网访问URL
        const fileUrl = this.ossClient.generateObjectUrl(objectKey);

        console.log(`✅ 文件上传成功: ${file.name}`);
        console.log(`🔗 访问URL: ${fileUrl}`);

        return fileUrl;
      } catch (error) {
        console.error(`❌ 文件上传失败 (${file.name}):`, error);

        // 提供更详细的错误信息和解决建议
        let errorMessage = `OSS上传失败`;
        let suggestions = [];

        if (error.code) {
          errorMessage += ` [${error.code}]: ${error.message}`;

          // 根据错误类型提供具体建议
          switch (error.code) {
            case 'ConnectionTimeoutError':
              suggestions.push('网络连接超时，请检查网络连接');
              suggestions.push('可能是文件过大或网络不稳定');
              suggestions.push('建议稍后重试或使用更稳定的网络');
              break;
            case 'RequestTimeoutError':
              suggestions.push('请求超时，可能是服务器响应慢');
              suggestions.push('建议稍后重试');
              break;
            case 'AccessDenied':
              suggestions.push('访问被拒绝，请检查OSS权限配置');
              suggestions.push('确认AccessKey有上传权限');
              break;
            case 'NoSuchBucket':
              suggestions.push('存储桶不存在，请检查bucket配置');
              break;
            case 'InvalidAccessKeyId':
              suggestions.push('AccessKey ID无效，请检查配置');
              break;
            default:
              suggestions.push('请检查OSS配置和网络连接');
          }
        } else if (error.message) {
          errorMessage += `: ${error.message}`;

          if (error.message.includes('timeout')) {
            suggestions.push('连接超时，请检查网络连接');
            suggestions.push('可能需要使用更稳定的网络环境');
          }
        }

        if (suggestions.length > 0) {
          errorMessage += '\n建议解决方案:\n' + suggestions.map(s => `• ${s}`).join('\n');
        }

        throw new Error(errorMessage);
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
   * 带重试机制的OSS上传
   * @param {string} objectKey - OSS对象键
   * @param {File} file - 文件对象
   * @param {Object} options - 上传选项
   * @param {number} fileIndex - 文件索引
   * @param {string} fileName - 文件名
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise<Object>} - 上传结果
   */
  async uploadWithRetry(objectKey, file, options, fileIndex, fileName, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 尝试上传 ${fileName} (第 ${attempt}/${maxRetries} 次)`);

        // 如果不是第一次尝试，添加延迟
        if (attempt > 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 指数退避，最大10秒
          console.log(`⏳ 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await this.ossClient.put(objectKey, file, options);

        if (attempt > 1) {
          console.log(`✅ ${fileName} 重试上传成功 (第 ${attempt} 次尝试)`);
        }

        return result;
      } catch (error) {
        lastError = error;
        console.warn(`❌ ${fileName} 上传失败 (第 ${attempt}/${maxRetries} 次):`, error.message);

        // 如果是最后一次尝试，或者是不可重试的错误，直接抛出
        if (attempt === maxRetries || this.isNonRetryableError(error)) {
          break;
        }
      }
    }

    // 所有重试都失败了，抛出最后一个错误
    throw lastError;
  }

  /**
   * 判断是否为不可重试的错误
   * @param {Error} error - 错误对象
   * @returns {boolean} - 是否为不可重试的错误
   */
  isNonRetryableError(error) {
    // 权限错误、文件格式错误等不应该重试
    const nonRetryableCodes = [
      'AccessDenied',
      'InvalidAccessKeyId',
      'SignatureDoesNotMatch',
      'NoSuchBucket',
      'InvalidArgument',
      'EntityTooLarge',
      'InvalidObjectName'
    ];

    return nonRetryableCodes.includes(error.code) ||
           error.status === 403 ||
           error.status === 400;
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
    console.log('🔍 检查OSS配置:', {
      region: this.ossConfig.region || 'undefined',
      bucket: this.ossConfig.bucket || 'undefined',
      accessKeyId: this.ossConfig.accessKeyId ? `${this.ossConfig.accessKeyId.substring(0, 8)}...` : 'undefined',
      hasSecret: !!this.ossConfig.accessKeySecret,
      endpoint: this.ossConfig.endpoint || 'default'
    });

    const isConfigured = !!(
      this.ossConfig.region &&
      this.ossConfig.bucket &&
      this.ossConfig.accessKeyId &&
      this.ossConfig.accessKeySecret
      // endpoint是可选的，OSS SDK会自动生成
    );

    console.log('✅ OSS配置状态:', isConfigured ? '已配置' : '未配置');
    return isConfigured;
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
