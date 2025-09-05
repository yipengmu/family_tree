/**
 * 服务测试工具
 * 用于测试各个服务是否正常工作
 */

import tenantService from '../services/tenantService';
import ocrService from '../services/ocrService';
import uploadService from '../services/uploadService';

/**
 * 测试租户服务
 */
export const testTenantService = () => {
  console.log('🧪 测试租户服务...');
  
  try {
    // 测试获取当前租户
    const currentTenant = tenantService.getCurrentTenant();
    console.log('✅ 当前租户:', currentTenant);
    
    // 测试多租户模式检查
    const isMultiTenant = tenantService.isMultiTenantMode();
    console.log('✅ 多租户模式:', isMultiTenant);
    
    // 测试租户头信息
    const headers = tenantService.getTenantHeaders();
    console.log('✅ 租户头信息:', headers);
    
    return true;
  } catch (error) {
    console.error('❌ 租户服务测试失败:', error);
    return false;
  }
};

/**
 * 测试OCR服务
 */
export const testOCRService = () => {
  console.log('🧪 测试OCR服务...');
  
  try {
    // 测试配置验证
    const config = ocrService.validateConfig();
    console.log('✅ OCR配置:', config);
    
    return true;
  } catch (error) {
    console.error('❌ OCR服务测试失败:', error);
    return false;
  }
};

/**
 * 测试上传服务
 */
export const testUploadService = () => {
  console.log('🧪 测试上传服务...');
  
  try {
    // 测试上传配置
    const config = uploadService.getUploadConfig();
    console.log('✅ 上传配置:', config);
    
    // 测试文件验证
    const validation = uploadService.validateFiles([]);
    console.log('✅ 空文件验证:', validation);
    
    return true;
  } catch (error) {
    console.error('❌ 上传服务测试失败:', error);
    return false;
  }
};

/**
 * 运行所有测试
 */
export const runAllTests = () => {
  console.log('🚀 开始运行服务测试...');
  
  const results = {
    tenant: testTenantService(),
    ocr: testOCRService(),
    upload: testUploadService(),
  };
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('🎉 所有服务测试通过！');
  } else {
    console.log('⚠️ 部分服务测试失败:', results);
  }
  
  return results;
};

// 在开发环境下自动运行测试
if (process.env.REACT_APP_ENV === 'development' && process.env.REACT_APP_DEBUG === 'true') {
  // 延迟运行测试，确保所有模块都已加载
  setTimeout(() => {
    runAllTests();
  }, 1000);
}
