/**
 * OSS配置验证工具
 */

class OSSConfigValidator {
  /**
   * 验证OSS配置
   * @param {Object} config OSS配置对象
   * @returns {Object} 验证结果
   */
  static validateConfig(config) {
    const errors = [];
    const warnings = [];
    
    // 检查必需字段
    if (!config.region) {
      errors.push('缺少 region 配置');
    } else if (!config.region.startsWith('oss-')) {
      errors.push('region 格式错误，应该以 "oss-" 开头，如 "oss-cn-shanghai"');
    }
    
    if (!config.bucket) {
      errors.push('缺少 bucket 配置');
    } else if (config.bucket.length < 3 || config.bucket.length > 63) {
      errors.push('bucket 名称长度应该在 3-63 个字符之间');
    }
    
    if (!config.accessKeyId) {
      errors.push('缺少 accessKeyId 配置');
    } else if (config.accessKeyId.length !== 24) {
      warnings.push('accessKeyId 长度异常，标准长度为 24 个字符');
    }
    
    if (!config.accessKeySecret) {
      errors.push('缺少 accessKeySecret 配置');
    } else if (config.accessKeySecret.length !== 30) {
      warnings.push('accessKeySecret 长度异常，标准长度为 30 个字符');
    }
    
    // 检查 endpoint
    if (config.endpoint) {
      if (!config.endpoint.startsWith('https://')) {
        warnings.push('建议使用 HTTPS endpoint');
      }
      
      if (config.endpoint.includes('accesspoint')) {
        errors.push('endpoint 不应该包含 accesspoint，请使用标准的 OSS endpoint');
      }
      
      // 检查 endpoint 格式
      const expectedEndpoint = `https://${config.region}.aliyuncs.com`;
      if (config.endpoint !== expectedEndpoint) {
        warnings.push(`建议使用标准 endpoint: ${expectedEndpoint}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateSuggestions(config)
    };
  }
  
  /**
   * 生成配置建议
   * @param {Object} config OSS配置对象
   * @returns {Array} 建议列表
   */
  static generateSuggestions(config) {
    const suggestions = [];
    
    if (config.region) {
      const standardEndpoint = `https://${config.region}.aliyuncs.com`;
      suggestions.push(`标准 endpoint: ${standardEndpoint}`);
    }
    
    suggestions.push('确保 bucket 权限设置为"公共读"以支持图片展示');
    suggestions.push('确保已配置正确的 CORS 规则');
    suggestions.push('建议使用 RAM 用户而非主账号的 AccessKey');
    
    return suggestions;
  }
  
  /**
   * 生成正确的配置示例
   * @param {string} region OSS区域
   * @param {string} bucket 存储桶名称
   * @returns {Object} 配置示例
   */
  static generateConfigExample(region = 'oss-cn-shanghai', bucket = 'your-bucket-name') {
    return {
      region,
      bucket,
      accessKeyId: 'LTAI5t***************', // 24位
      accessKeySecret: '***************************', // 30位
      endpoint: `https://${region}.aliyuncs.com`,
      secure: true
    };
  }
  
  /**
   * 检查网络连接
   * @param {string} endpoint OSS endpoint
   * @returns {Promise<boolean>} 连接状态
   */
  static async checkNetworkConnection(endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch (error) {
      console.warn('网络连接检查失败:', error.message);
      return false;
    }
  }
  
  /**
   * 生成诊断报告
   * @param {Object} config OSS配置对象
   * @returns {Promise<Object>} 诊断报告
   */
  static async generateDiagnosticReport(config) {
    const validation = this.validateConfig(config);
    const networkOk = await this.checkNetworkConnection(config.endpoint);
    
    return {
      timestamp: new Date().toISOString(),
      config: {
        region: config.region,
        bucket: config.bucket,
        endpoint: config.endpoint,
        hasAccessKeyId: !!config.accessKeyId,
        hasAccessKeySecret: !!config.accessKeySecret
      },
      validation,
      network: {
        endpointReachable: networkOk
      },
      recommendations: this.getRecommendations(validation, networkOk)
    };
  }
  
  /**
   * 获取修复建议
   * @param {Object} validation 验证结果
   * @param {boolean} networkOk 网络状态
   * @returns {Array} 修复建议
   */
  static getRecommendations(validation, networkOk) {
    const recommendations = [];
    
    if (!validation.isValid) {
      recommendations.push('🔧 修复配置错误:');
      validation.errors.forEach(error => {
        recommendations.push(`  - ${error}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      recommendations.push('⚠️ 配置警告:');
      validation.warnings.forEach(warning => {
        recommendations.push(`  - ${warning}`);
      });
    }
    
    if (!networkOk) {
      recommendations.push('🌐 网络问题:');
      recommendations.push('  - 检查网络连接');
      recommendations.push('  - 确认 endpoint 地址正确');
      recommendations.push('  - 检查防火墙设置');
    }
    
    recommendations.push('📋 通用建议:');
    recommendations.push('  - 在阿里云控制台验证 bucket 存在');
    recommendations.push('  - 检查 AccessKey 权限');
    recommendations.push('  - 确认 CORS 规则配置正确');
    
    return recommendations;
  }
}

export default OSSConfigValidator;
