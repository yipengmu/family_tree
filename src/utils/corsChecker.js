/**
 * CORS检查工具
 */

class CORSChecker {
  /**
   * 检查是否可以访问阿里云API
   */
  static async checkDashScopeAccess() {
    const testUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

    try {
      console.log('🔍 检查阿里云DashScope兼容模式API访问性...');

      // 尝试简单的HEAD请求
      const response = await fetch(testUrl, {
        method: 'HEAD',
        mode: 'no-cors' // 避免CORS检查
      });

      console.log('✅ 网络连接正常');
      return { success: true, message: '网络连接正常' };
      
    } catch (error) {
      console.error('❌ 网络连接失败:', error);
      
      if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
        return {
          success: false,
          error: 'CORS',
          message: 'CORS跨域限制',
          solutions: [
            '安装CORS浏览器插件（仅开发环境）',
            '使用代理服务器',
            '部署到支持CORS的服务器'
          ]
        };
      }
      
      return {
        success: false,
        error: 'NETWORK',
        message: '网络连接失败',
        solutions: [
          '检查网络连接',
          '检查防火墙设置',
          '尝试使用VPN'
        ]
      };
    }
  }

  /**
   * 检查API Key配置
   */
  static checkAPIKeyConfig() {
    const apiKey = process.env.REACT_APP_QWEN_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'NO_API_KEY',
        message: '未配置API Key',
        solutions: [
          '在.env文件中设置REACT_APP_QWEN_API_KEY',
          '重启开发服务器'
        ]
      };
    }
    
    if (apiKey.length < 20) {
      return {
        success: false,
        error: 'INVALID_API_KEY',
        message: 'API Key格式可能不正确',
        solutions: [
          '检查API Key是否完整',
          '确认API Key来源正确'
        ]
      };
    }
    
    return {
      success: true,
      message: 'API Key配置正确',
      keyPreview: `${apiKey.substring(0, 10)}...`
    };
  }

  /**
   * 综合检查
   */
  static async performFullCheck() {
    console.log('\n🔍 ========== CORS和API配置检查 ==========');
    
    const results = {
      apiKey: this.checkAPIKeyConfig(),
      network: await this.checkDashScopeAccess()
    };
    
    console.log('📋 检查结果:');
    console.log('🔑 API Key:', results.apiKey.success ? '✅ 正常' : '❌ 异常');
    console.log('🌐 网络连接:', results.network.success ? '✅ 正常' : '❌ 异常');
    
    if (!results.apiKey.success) {
      console.log('\n❌ API Key问题:');
      console.log(`   错误: ${results.apiKey.message}`);
      console.log('   解决方案:');
      results.apiKey.solutions.forEach(solution => {
        console.log(`   - ${solution}`);
      });
    }
    
    if (!results.network.success) {
      console.log('\n❌ 网络问题:');
      console.log(`   错误: ${results.network.message}`);
      console.log('   解决方案:');
      results.network.solutions.forEach(solution => {
        console.log(`   - ${solution}`);
      });
    }
    
    if (results.apiKey.success && results.network.success) {
      console.log('\n✅ 所有检查通过，可以正常使用OCR功能');
    } else {
      console.log('\n⚠️ 发现问题，请根据上述建议进行修复');
    }
    
    console.log('=====================================\n');
    
    return results;
  }

  /**
   * 生成CORS解决方案指南
   */
  static generateCORSSolutions() {
    return `
# CORS问题解决方案

## 开发环境解决方案

### 1. 使用CORS浏览器插件（推荐）
- Chrome: 搜索"CORS Unblock"或"CORS Toggle"
- Firefox: 搜索"CORS Everywhere"
- 安装后启用插件，刷新页面

### 2. 启动Chrome时禁用安全检查
\`\`\`bash
# macOS
open -n -a /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security

# Windows
chrome.exe --user-data-dir="c:/chrome_dev_test" --disable-web-security
\`\`\`

### 3. 使用代理服务器
创建本地代理服务器转发API请求，避免CORS限制。

## 生产环境解决方案

### 1. 后端代理
在后端服务器创建API代理端点，前端调用后端API。

### 2. 服务器端渲染
使用Next.js等框架在服务器端调用API。

### 3. 使用阿里云SDK
使用官方SDK和STS临时凭证，避免直接API调用。

## 当前推荐方案

开发环境：使用CORS浏览器插件
生产环境：使用后端代理服务
`;
  }
}

export default CORSChecker;
