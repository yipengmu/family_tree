#!/usr/bin/env node

/**
 * 验证通义千问配置脚本
 * 快速验证API Key和配置是否正确
 */

// 读取环境变量
require('dotenv').config();

const config = {
  apiKey: process.env.REACT_APP_QWEN_API_KEY,
  model: process.env.REACT_APP_QWEN_MODEL || 'qwen-vl-max',
  endpoint: process.env.REACT_APP_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
};

console.log('🔍 验证通义千问配置...\n');

// 显示配置信息
console.log('📋 当前配置:');
console.log(`  API Key: ${config.apiKey ? `已配置 (${config.apiKey.substring(0, 8)}...)` : '❌ 未配置'}`);
console.log(`  模型: ${config.model}`);
console.log(`  端点: ${config.endpoint}\n`);

// 验证配置
function verifyConfig() {
  const issues = [];
  
  if (!config.apiKey) {
    issues.push('❌ 缺少 REACT_APP_QWEN_API_KEY');
  } else {
    if (!config.apiKey.startsWith('sk-')) {
      issues.push('⚠️ API Key格式可能不正确，应以"sk-"开头');
    }
    if (config.apiKey.length < 20) {
      issues.push('⚠️ API Key长度可能不正确');
    }
  }
  
  if (!config.endpoint) {
    issues.push('❌ 缺少 REACT_APP_QWEN_ENDPOINT');
  }
  
  if (!config.model) {
    issues.push('❌ 缺少 REACT_APP_QWEN_MODEL');
  }
  
  return issues;
}

// 测试API连接
async function testAPIConnection() {
  if (!config.apiKey) {
    console.log('❌ 无法测试API连接：缺少API Key\n');
    return false;
  }
  
  try {
    console.log('🔗 测试API连接...');
    
    // 导入fetch (Node.js环境)
    const fetch = require('node-fetch');
    
    const requestBody = {
      model: config.model,
      input: {
        messages: [
          {
            role: "user",
            content: [
              {
                text: "你好，请回复'连接测试成功'"
              }
            ]
          }
        ]
      },
      parameters: {
        result_format: "message",
        max_tokens: 50,
        temperature: 0.1
      }
    };
    
    const startTime = Date.now();
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody)
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ API连接失败: ${response.status} ${response.statusText}`);
      console.log(`📄 错误详情: ${errorText}\n`);
      
      if (response.status === 401) {
        console.log('💡 建议: API Key可能无效或已过期');
      } else if (response.status === 400) {
        console.log('💡 建议: 请求格式可能有问题');
      } else if (response.status === 429) {
        console.log('💡 建议: API调用频率过高，请稍后重试');
      }
      
      return false;
    }
    
    const result = await response.json();
    console.log(`✅ API连接成功 (响应时间: ${duration}ms)`);
    
    if (result.output && result.output.choices && result.output.choices.length > 0) {
      const content = result.output.choices[0].message.content;
      console.log(`📝 API响应: ${content}`);
    }
    
    console.log();
    return true;
    
  } catch (error) {
    console.log(`❌ API连接测试失败: ${error.message}\n`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 建议: 检查网络连接或DNS设置');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 建议: 检查端点URL是否正确');
    }
    
    return false;
  }
}

// 主函数
async function main() {
  // 1. 验证配置
  console.log('1️⃣ 验证配置...');
  const issues = verifyConfig();
  
  if (issues.length === 0) {
    console.log('✅ 配置验证通过\n');
  } else {
    console.log('配置问题:');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log();
  }
  
  // 2. 测试API连接
  console.log('2️⃣ 测试API连接...');
  const connectionOk = await testAPIConnection();
  
  // 3. 总结
  console.log('📊 验证结果:');
  console.log(`  配置状态: ${issues.length === 0 ? '✅ 正常' : '❌ 有问题'}`);
  console.log(`  API连接: ${connectionOk ? '✅ 正常' : '❌ 失败'}`);
  
  if (issues.length === 0 && connectionOk) {
    console.log('\n🎉 通义千问配置完全正常，可以开始使用OCR功能！');
  } else {
    console.log('\n🔧 请根据上述建议修复配置问题');
    
    if (issues.length > 0) {
      console.log('\n📝 配置修复步骤:');
      console.log('1. 检查 .env 文件中的配置项');
      console.log('2. 确保 REACT_APP_QWEN_API_KEY 设置正确');
      console.log('3. 重启应用以加载新配置');
    }
  }
}

// 运行验证
main().catch(console.error);
