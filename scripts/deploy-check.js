/**
 * Vercel部署检查脚本
 * 验证部署配置和API端点可用性
 */

require('dotenv').config();

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.tatababa.top' 
  : 'http://localhost:3000';

async function checkHealth() {
  console.log('🔍 检查健康状态端点...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ 健康状态检查通过');
      console.log('📊 响应数据:', data);
      return true;
    } else {
      console.log('❌ 健康状态检查失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 健康状态检查错误:', error.message);
    return false;
  }
}

async function checkAuthEndpoints() {
  console.log('\n🔍 检查认证端点...');
  
  const endpoints = [
    { method: 'POST', url: '/api/auth/login', desc: '登录' },
    { method: 'POST', url: '/api/auth/register', desc: '注册' },
    { method: 'POST', url: '/api/auth/send-code', desc: '发送验证码' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      console.log(`✅ ${endpoint.desc}端点可达 - 状态码: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint.desc}端点错误:`, error.message);
    }
  }
}

async function checkFamilyDataEndpoints() {
  console.log('\n🔍 检查家谱数据端点...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/family-data/default`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ 家谱数据端点可达');
      console.log('📊 数据条数:', data.count);
    } else {
      console.log('❌ 家谱数据端点错误:', data);
    }
  } catch (error) {
    console.log('❌ 家谱数据端点错误:', error.message);
  }
}

async function checkTenantEndpoints() {
  console.log('\n🔍 检查租户管理端点...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/tenants`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ 租户管理端点可达');
      console.log('📊 租户数量:', data.count);
    } else {
      console.log('❌ 租户管理端点错误:', data);
    }
  } catch (error) {
    console.log('❌ 租户管理端点错误:', error.message);
  }
}

async function testVerificationCodeFlow() {
  console.log('\n🔍 测试验证码流程...');
  
  try {
    // 生成测试邮箱
    const testEmail = `test${Date.now()}@example.com`;
    
    // 测试发送验证码
    console.log(`📧 发送注册验证码到: ${testEmail}`);
    const sendResponse = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        purpose: 'register'
      })
    });
    
    const sendResult = await sendResponse.json();
    console.log(`✅ 发送验证码响应 - 状态: ${sendResponse.status}, 成功: ${sendResult.success}`);
    
    if (sendResult.success) {
      console.log('✅ 验证码发送流程正常');
    } else {
      console.log('❌ 验证码发送失败:', sendResult.error);
    }
  } catch (error) {
    console.log('❌ 验证码流程测试错误:', error.message);
  }
}

async function runDeploymentCheck() {
  console.log('🚀 开始Vercel部署检查...\n');
  console.log(`🌐 目标URL: ${API_BASE_URL}`);
  console.log(`📅 检查时间: ${new Date().toISOString()}\n`);
  
  const checks = [
    await checkHealth(),
    checkAuthEndpoints(),
    checkFamilyDataEndpoints(),
    checkTenantEndpoints(),
    testVerificationCodeFlow()
  ];
  
  console.log('\n🎯 部署检查完成!');
  
  if (checks[0]) {
    console.log('✅ 后端服务健康状态正常');
  } else {
    console.log('❌ 后端服务存在问题');
  }
  
  console.log('\n💡 提示: 如果遇到405错误，请确认Vercel函数正确处理了HTTP方法');
  console.log('💡 提示: 确保所有API端点都正确设置了CORS头');
  console.log('💡 提示: 检查vercel.json配置是否正确');
}

// 如果直接运行此脚本
if (require.main === module) {
  runDeploymentCheck().catch(console.error);
}

module.exports = {
  runDeploymentCheck,
  checkHealth,
  checkAuthEndpoints,
  checkFamilyDataEndpoints,
  checkTenantEndpoints,
  testVerificationCodeFlow
};