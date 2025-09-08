#!/usr/bin/env node

/**
 * 测试代理服务器脚本
 */

const fetch = require('node-fetch');

const PROXY_URL = 'http://localhost:3001';

async function testProxy() {
  console.log('🔍 测试代理服务器...\n');

  try {
    // 1. 测试健康检查
    console.log('1️⃣ 测试健康检查...');
    const healthResponse = await fetch(`${PROXY_URL}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 代理服务器运行正常');
      console.log('📋 服务状态:', healthData);
    } else {
      console.log('❌ 代理服务器健康检查失败');
      return;
    }

    console.log();

    // 2. 测试OCR接口
    console.log('2️⃣ 测试OCR接口...');
    const testImageUrl = 'https://example.com/test-image.jpg'; // 测试用的图片URL
    
    const ocrResponse = await fetch(`${PROXY_URL}/api/qwen/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: [testImageUrl],
        tenantId: 'test'
      })
    });

    if (ocrResponse.ok) {
      const ocrData = await ocrResponse.json();
      console.log('✅ OCR接口响应正常');
      console.log('📄 响应数据:', ocrData);
    } else {
      const errorText = await ocrResponse.text();
      console.log('❌ OCR接口测试失败:', errorText);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ 无法连接到代理服务器');
      console.log('💡 请先启动代理服务器: npm run proxy');
    } else {
      console.log('❌ 测试失败:', error.message);
    }
  }
}

testProxy();
