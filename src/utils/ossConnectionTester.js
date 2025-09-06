/**
 * OSS连接测试工具
 * 用于诊断和解决OSS连接问题
 */

import OSS from 'ali-oss';

class OSSConnectionTester {
  constructor(config) {
    this.config = config;
    this.testResults = [];
  }

  /**
   * 执行完整的连接诊断
   * @returns {Promise<Object>} 诊断结果
   */
  async runFullDiagnostic() {
    console.log('🔍 开始OSS连接诊断...');
    
    const results = {
      timestamp: new Date().toISOString(),
      config: this.sanitizeConfig(this.config),
      tests: {},
      recommendations: []
    };

    // 1. 配置验证
    results.tests.configValidation = await this.testConfigValidation();
    
    // 2. 网络连接测试
    results.tests.networkConnectivity = await this.testNetworkConnectivity();
    
    // 3. OSS服务可达性测试
    results.tests.ossReachability = await this.testOSSReachability();
    
    // 4. 认证测试
    results.tests.authentication = await this.testAuthentication();
    
    // 5. 上传测试
    results.tests.uploadTest = await this.testUpload();
    
    // 生成建议
    results.recommendations = this.generateRecommendations(results.tests);
    
    console.log('✅ OSS连接诊断完成');
    return results;
  }

  /**
   * 测试配置验证
   */
  async testConfigValidation() {
    const test = { name: '配置验证', success: false, details: [] };
    
    try {
      const required = ['region', 'bucket', 'accessKeyId', 'accessKeySecret'];
      const missing = required.filter(key => !this.config[key]);
      
      if (missing.length > 0) {
        test.details.push(`缺少必需配置: ${missing.join(', ')}`);
        return test;
      }
      
      // 验证格式
      if (!this.config.region.startsWith('oss-')) {
        test.details.push('region格式错误，应以"oss-"开头');
      }
      
      if (this.config.accessKeyId.length !== 24) {
        test.details.push('accessKeyId长度异常');
      }
      
      if (this.config.accessKeySecret.length !== 30) {
        test.details.push('accessKeySecret长度异常');
      }
      
      test.success = test.details.length === 0;
      if (test.success) {
        test.details.push('配置验证通过');
      }
      
    } catch (error) {
      test.details.push(`配置验证失败: ${error.message}`);
    }
    
    return test;
  }

  /**
   * 测试网络连接
   */
  async testNetworkConnectivity() {
    const test = { name: '网络连接', success: false, details: [] };
    
    try {
      const testUrls = [
        'https://www.aliyun.com',
        'https://oss.console.aliyun.com',
        `https://${this.config.region}.aliyuncs.com`
      ];
      
      for (const url of testUrls) {
        try {
          await Promise.race([
            fetch(url, { method: 'HEAD', mode: 'no-cors' }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('超时')), 5000)
            )
          ]);
          test.details.push(`✅ ${url} 可达`);
        } catch (error) {
          test.details.push(`❌ ${url} 不可达: ${error.message}`);
        }
      }
      
      test.success = test.details.some(detail => detail.includes('✅'));
      
    } catch (error) {
      test.details.push(`网络测试失败: ${error.message}`);
    }
    
    return test;
  }

  /**
   * 测试OSS服务可达性
   */
  async testOSSReachability() {
    const test = { name: 'OSS服务可达性', success: false, details: [] };
    
    try {
      const endpoint = this.config.endpoint || `https://${this.config.region}.aliyuncs.com`;
      
      const startTime = Date.now();
      await Promise.race([
        fetch(endpoint, { method: 'HEAD', mode: 'no-cors' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接超时')), 10000)
        )
      ]);
      
      const duration = Date.now() - startTime;
      test.success = true;
      test.details.push(`OSS服务可达 (响应时间: ${duration}ms)`);
      
      if (duration > 5000) {
        test.details.push('⚠️ 响应时间较长，可能影响上传性能');
      }
      
    } catch (error) {
      test.details.push(`OSS服务不可达: ${error.message}`);
    }
    
    return test;
  }

  /**
   * 测试认证
   */
  async testAuthentication() {
    const test = { name: '认证测试', success: false, details: [] };
    
    try {
      const ossClient = new OSS({
        region: this.config.region,
        bucket: this.config.bucket,
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        endpoint: this.config.endpoint,
        secure: true,
        timeout: 30000
      });
      
      const result = await ossClient.getBucketInfo();
      test.success = true;
      test.details.push('认证成功');
      test.details.push(`Bucket: ${result.bucket.name}`);
      test.details.push(`区域: ${result.bucket.region}`);
      
    } catch (error) {
      test.details.push(`认证失败: ${error.message}`);
      
      if (error.code === 'InvalidAccessKeyId') {
        test.details.push('💡 AccessKey ID无效，请检查配置');
      } else if (error.code === 'SignatureDoesNotMatch') {
        test.details.push('💡 AccessKey Secret错误，请检查配置');
      } else if (error.code === 'NoSuchBucket') {
        test.details.push('💡 Bucket不存在，请检查bucket名称');
      }
    }
    
    return test;
  }

  /**
   * 测试上传功能
   */
  async testUpload() {
    const test = { name: '上传测试', success: false, details: [] };
    
    try {
      const ossClient = new OSS({
        region: this.config.region,
        bucket: this.config.bucket,
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        endpoint: this.config.endpoint,
        secure: true,
        timeout: 60000,
        // 添加连接池配置
        agent: {
          keepAlive: true,
          keepAliveMsecs: 30000,
          maxSockets: 10,
          timeout: 60000,
        }
      });
      
      const testContent = `OSS连接测试 - ${new Date().toISOString()}`;
      const testKey = `family-tree/test/connection-test-${Date.now()}.txt`;
      
      const startTime = Date.now();
      await ossClient.put(testKey, Buffer.from(testContent));
      const uploadDuration = Date.now() - startTime;
      
      // 立即删除测试文件
      await ossClient.delete(testKey);
      
      test.success = true;
      test.details.push(`上传测试成功 (耗时: ${uploadDuration}ms)`);
      
      if (uploadDuration > 10000) {
        test.details.push('⚠️ 上传速度较慢，可能影响用户体验');
      }
      
    } catch (error) {
      test.details.push(`上传测试失败: ${error.message}`);
      
      if (error.code === 'ConnectionTimeoutError') {
        test.details.push('💡 连接超时，建议检查网络环境');
      } else if (error.code === 'RequestTimeoutError') {
        test.details.push('💡 请求超时，建议稍后重试');
      }
    }
    
    return test;
  }

  /**
   * 生成修复建议
   */
  generateRecommendations(tests) {
    const recommendations = [];
    
    if (!tests.configValidation.success) {
      recommendations.push('🔧 修复配置问题');
      recommendations.push(...tests.configValidation.details.map(d => `  • ${d}`));
    }
    
    if (!tests.networkConnectivity.success) {
      recommendations.push('🌐 网络连接问题');
      recommendations.push('  • 检查网络连接是否正常');
      recommendations.push('  • 确认防火墙或代理设置');
      recommendations.push('  • 尝试更换网络环境');
    }
    
    if (!tests.authentication.success) {
      recommendations.push('🔐 认证问题');
      recommendations.push('  • 验证AccessKey配置');
      recommendations.push('  • 检查RAM用户权限');
      recommendations.push('  • 确认Bucket存在且可访问');
    }
    
    if (!tests.uploadTest.success) {
      recommendations.push('📤 上传问题');
      recommendations.push('  • 检查网络稳定性');
      recommendations.push('  • 考虑增加超时时间');
      recommendations.push('  • 尝试分片上传大文件');
    }
    
    // 通用建议
    recommendations.push('📋 通用建议');
    recommendations.push('  • 使用稳定的网络环境');
    recommendations.push('  • 避免在网络高峰期上传');
    recommendations.push('  • 考虑使用CDN加速');
    
    return recommendations;
  }

  /**
   * 清理敏感配置信息
   */
  sanitizeConfig(config) {
    return {
      region: config.region,
      bucket: config.bucket,
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId ? `${config.accessKeyId.substring(0, 8)}...` : 'undefined',
      hasSecret: !!config.accessKeySecret
    };
  }
}

export default OSSConnectionTester;
