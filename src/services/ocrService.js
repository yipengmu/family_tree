/**
 * OCR服务 - 专门使用通义千问VL-Max
 */

import qwenOcrService from './qwenOcrService';
import familyDataGenerator from './familyDataGenerator';

class OCRService {
  constructor() {
    // 通义千问配置
    this.qwenApiKey = process.env.REACT_APP_QWEN_API_KEY;

    // 启动时显示配置状态
    console.log('🔧 OCR服务初始化...');
    console.log('🔑 通义千问API Key:', this.qwenApiKey ? `已配置 (${this.qwenApiKey.substring(0, 8)}...)` : '未配置');
    console.log('🎯 使用服务: 通义千问VL-Max');
  }

  /**
   * 识别图片中的家谱信息 - 优先使用通义千问VL-Max
   * @param {Array<string>} imageUrls - 图片URL数组
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 识别选项
   * @returns {Promise<Array>} - 解析后的家谱数据
   */
  async recognizeFamilyTree(imageUrls, tenantId = 'default', options = {}) {
    try {
      console.log('🔍 开始通义千问VL-Max OCR识别，图片数量:', imageUrls.length);
      console.log('📋 图片URLs:', imageUrls);
      console.log('🏢 租户ID:', tenantId);

      // 检查API Key配置
      if (!this.qwenApiKey) {
        console.error('❌ 未配置通义千问API Key');
        throw new Error('请在.env文件中配置通义千问API Key (REACT_APP_QWEN_API_KEY)');
      }

      console.log('🚀 使用通义千问VL-Max进行识别...');
      console.log('📸 真实图片URL列表:', imageUrls);

      // 首先检查代理服务器是否运行
      await this.checkProxyServer();

      // 调用通义千问OCR服务
      const recognitionResult = await qwenOcrService.recognizeFamilyTree(imageUrls, tenantId);
      console.log('✅ 通义千问识别成功，结果数量:', recognitionResult?.length || 0);

      // 自动生成familyData文件
      if (options.generateFile !== false && recognitionResult.length > 0) {
        await this.generateFamilyDataFile(recognitionResult, tenantId, options);
      }

      return recognitionResult;

    } catch (error) {
      console.error('❌ OCR识别失败:', error);
      console.error('❌ 错误详情:', error.stack);

      // 提供具体的错误建议
      let errorMessage = error.message;
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        errorMessage = '代理服务器未启动。请先运行: npm run test-proxy';
      } else if (error.message.includes('API Key')) {
        errorMessage = '请检查通义千问API Key配置';
      }

      throw new Error(`OCR识别失败: ${errorMessage}`);
    }
  }

  /**
   * 检查代理服务器是否运行
   * @returns {Promise<void>}
   */
  async checkProxyServer() {
    try {
      const proxyUrl = process.env.REACT_APP_PROXY_ENDPOINT || 'http://localhost:3001/api/qwen/ocr';
      const healthUrl = proxyUrl.replace('/api/qwen/ocr', '/health');

      console.log('🔍 检查代理服务器状态:', healthUrl);

      const response = await fetch(healthUrl, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 代理服务器运行正常:', data);
      } else {
        throw new Error(`代理服务器响应异常: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 代理服务器检查失败:', error.message);
      throw new Error('代理服务器未启动或无法访问');
    }
  }



  /**
   * 生成familyData文件
   * @param {Array} familyData - 家谱数据
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 生成选项
   * @returns {Promise<Object>} - 生成结果
   */
  async generateFamilyDataFile(familyData, tenantId, options = {}) {
    try {
      console.log('📝 开始生成familyData文件...');

      const generateOptions = {
        suffix: 'qwen-ocr',
        includeStats: true,
        ...options
      };

      const result = await familyDataGenerator.generateFamilyDataFile(
        familyData,
        tenantId,
        generateOptions
      );

      if (result.success) {
        console.log('✅ familyData文件生成成功:', result.fileName);
        console.log('📊 文件统计:', result.stats);

        // 如果需要自动下载
        if (options.autoDownload !== false) {
          familyDataGenerator.downloadFile(result.downloadInfo);
        }
      } else {
        console.error('❌ familyData文件生成失败:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ 生成familyData文件时发生错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }





  /**
   * 验证OCR配置是否完整
   * @returns {Object} - 验证结果
   */
  validateConfig() {
    const issues = [];

    // 检查通义千问配置
    if (!this.qwenApiKey) {
      issues.push('缺少通义千问API Key');
    }

    const hasQwenConfig = !!this.qwenApiKey;

    return {
      isValid: hasQwenConfig,
      issues: hasQwenConfig ? [] : issues,
      warnings: [],
      hasQwenConfig,
      preferredService: hasQwenConfig ? '通义千问VL-Max' : '未配置',
      isDevMode: process.env.REACT_APP_ENV === 'development' && !hasQwenConfig,
    };
  }
}

// 创建单例实例
const ocrService = new OCRService();

export default ocrService;
