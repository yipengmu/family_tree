/**
 * 测试后端OCR服务
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function testBackendOCR() {
  console.log('🧪 ========== 测试后端OCR服务 ==========');
  console.log('🏢 后端服务:', BACKEND_URL);
  console.log('🖼️ 测试图片:', TEST_IMAGE);

  // 1. 测试健康检查
  console.log('\n1️⃣ 测试后端健康检查...');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 后端服务正常:', healthData.message);
    } else {
      console.error('❌ 后端服务异常:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.error('❌ 无法连接到后端服务:', error.message);
    console.error('💡 请确保后端服务已启动: npm run server');
    return;
  }

  // 2. 测试OCR接口
  console.log('\n2️⃣ 测试OCR识别接口...');
  try {
    const startTime = Date.now();
    
    const ocrResponse = await fetch(`${BACKEND_URL}/api/qwen/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: [TEST_IMAGE],
        tenantId: 'test'
      }),
      timeout: 60000
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ OCR请求响应时间: ${duration}ms`);
    console.log(`📊 响应状态: ${ocrResponse.status} ${ocrResponse.statusText}`);

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json().catch(() => ({}));
      console.error('❌ OCR请求失败:', errorData);
      
      if (ocrResponse.status === 500 && errorData.code === 'MISSING_API_KEY') {
        console.error('💡 请在.env文件中配置 REACT_APP_QWEN_API_KEY');
      }
      return;
    }

    const result = await ocrResponse.json();
    console.log('📥 OCR响应:', {
      success: result.success,
      count: result.count,
      processedImages: result.processedImages,
      requestId: result.requestId
    });

    if (result.success && result.data && result.data.length > 0) {
      console.log('\n✅ OCR识别成功！');
      console.log(`📊 识别统计:`);
      console.log(`- 总人数: ${result.data.length}`);
      
      const generations = [...new Set(result.data.map(p => p.g_rank))].sort();
      console.log(`- 世代数: ${generations.length}`);
      console.log(`- 世代分布: ${generations.map(g => `第${g}代: ${result.data.filter(p => p.g_rank === g).length}人`).join(', ')}`);
      
      console.log('\n👥 识别到的人物:');
      result.data.forEach((person, index) => {
        console.log(`${index + 1}. ${person.name} (第${person.g_rank}代, ID:${person.id})`);
      });
      
      console.log('\n🎉 测试成功！后端OCR服务工作正常');
      
    } else {
      console.warn('⚠️ OCR识别返回空结果');
      console.log('完整响应:', result);
    }

  } catch (error) {
    console.error('\n❌ OCR请求失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 无法连接到后端服务，请检查服务是否启动');
    } else if (error.name === 'FetchError' && error.message.includes('timeout')) {
      console.error('💡 请求超时，千问API响应时间较长');
    } else {
      console.error('💡 其他错误，请检查网络连接和API配置');
    }
  }
}

// 运行测试
testBackendOCR().catch(console.error);
