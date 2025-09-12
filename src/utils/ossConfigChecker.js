/**
 * OSS配置检查工具
 */

class OSSConfigChecker {
  /**
   * 检查OSS配置
   * @returns {Object} 检查结果
   */
  static checkConfig() {
    const config = {
      region: process.env.REACT_APP_OSS_REGION,
      bucket: process.env.REACT_APP_OSS_BUCKET,
      accessKeyId: process.env.REACT_APP_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.REACT_APP_OSS_ACCESS_KEY_SECRET,
      endpoint: process.env.REACT_APP_OSS_ENDPOINT
    };

    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      config: {
        region: config.region || 'undefined',
        bucket: config.bucket || 'undefined',
        accessKeyId: config.accessKeyId ? `${config.accessKeyId.substring(0, 8)}...` : 'undefined',
        hasSecret: !!config.accessKeySecret,
        endpoint: config.endpoint || 'default (auto-generated)'
      }
    };

    // 检查必需的配置项
    if (!config.region) {
      result.errors.push('REACT_APP_OSS_REGION 未配置');
      result.isValid = false;
    }

    if (!config.bucket) {
      result.errors.push('REACT_APP_OSS_BUCKET 未配置');
      result.isValid = false;
    }

    if (!config.accessKeyId) {
      result.errors.push('REACT_APP_OSS_ACCESS_KEY_ID 未配置');
      result.isValid = false;
    }

    if (!config.accessKeySecret) {
      result.errors.push('REACT_APP_OSS_ACCESS_KEY_SECRET 未配置');
      result.isValid = false;
    }

    // 检查配置格式
    if (config.region && !config.region.startsWith('oss-')) {
      result.warnings.push('region格式可能不正确，应该以"oss-"开头，如"oss-cn-hangzhou"');
    }

    if (config.accessKeyId && config.accessKeyId.length < 16) {
      result.warnings.push('accessKeyId长度可能不正确');
    }

    if (config.accessKeySecret && config.accessKeySecret.length < 20) {
      result.warnings.push('accessKeySecret长度可能不正确');
    }

    return result;
  }

  /**
   * 打印配置检查结果
   */
  static printConfigStatus() {
    console.log('\n🔍 ========== OSS配置检查 ==========');
    
    const result = this.checkConfig();
    
    console.log('📋 当前配置:');
    Object.entries(result.config).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    if (result.errors.length > 0) {
      console.log('\n❌ 配置错误:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️ 配置警告:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (result.isValid) {
      console.log('\n✅ OSS配置验证通过');
    } else {
      console.log('\n❌ OSS配置验证失败');
      console.log('\n🔧 解决方案:');
      console.log('1. 复制 .env.example 到 .env');
      console.log('2. 在 .env 文件中配置以下变量:');
      console.log('   REACT_APP_OSS_REGION=oss-cn-hangzhou');
      console.log('   REACT_APP_OSS_BUCKET=your-bucket-name');
      console.log('   REACT_APP_OSS_ACCESS_KEY_ID=your-access-key-id');
      console.log('   REACT_APP_OSS_ACCESS_KEY_SECRET=your-access-key-secret');
      console.log('3. 重启开发服务器');
    }

    console.log('=====================================\n');
    
    return result;
  }

  /**
   * 生成配置模板
   */
  static generateConfigTemplate() {
    return `# 阿里云OSS配置
REACT_APP_OSS_REGION=oss-cn-hangzhou
REACT_APP_OSS_BUCKET=your-bucket-name
REACT_APP_OSS_ACCESS_KEY_ID=your-access-key-id
REACT_APP_OSS_ACCESS_KEY_SECRET=your-access-key-secret
# REACT_APP_OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com  # 可选

# 阿里云通义千问API配置
REACT_APP_QWEN_API_KEY=your-qwen-api-key

# 应用配置
REACT_APP_DEFAULT_TENANT_ID=default
REACT_APP_ENABLE_MULTI_TENANT=true`;
  }
}

export default OSSConfigChecker;
