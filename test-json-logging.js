/**
 * 测试完整JSON结构体日志打印
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function testJSONLogging() {
  console.log('🧪 ========== 测试完整JSON结构体日志打印 ==========');
  console.log('🏢 后端服务:', BACKEND_URL);
  console.log('🖼️ 测试图片:', TEST_IMAGE);
  console.log('⏰ 测试时间:', new Date().toISOString());
  console.log('');

  // 1. 测试后端健康检查
  console.log('1️⃣ 测试后端健康检查...');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`, {
      timeout: 5000
    });
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 后端服务正常:', healthData.message);
    } else {
      console.error('❌ 后端服务异常:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.error('❌ 无法连接到后端服务:', error.message);
    console.error('💡 请确保后端服务已启动: node server/app.js');
    return;
  }

  // 2. 测试OCR接口的JSON日志
  console.log('\n2️⃣ 测试OCR接口的JSON日志...');
  console.log('📋 预期的日志内容:');
  console.log('- 📤 请求结构体: 完整的千问API请求JSON');
  console.log('- 📥 返回结构体: 完整的千问API响应JSON');
  console.log('- ❌ 错误结构体: 完整的错误信息JSON（如果有错误）');
  console.log('');

  try {
    const startTime = Date.now();
    console.log(`📤 [${getTimestamp()}] 发送OCR请求...`);
    console.log('💡 请观察后端控制台的详细JSON日志输出');
    
    const ocrResponse = await fetch(`${BACKEND_URL}/api/qwen/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: [TEST_IMAGE],
        tenantId: 'json-logging-test'
      }),
      timeout: 150000 // 150秒超时
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ [${getTimestamp()}] OCR请求总时间: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
    console.log(`📊 [${getTimestamp()}] 响应状态: ${ocrResponse.status} ${ocrResponse.statusText}`);

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json().catch(() => ({}));
      console.error('❌ OCR请求失败:', {
        status: ocrResponse.status,
        statusText: ocrResponse.statusText,
        error: errorData
      });
      
      console.log('\n📋 后端应该已打印以下JSON结构体:');
      console.log('- 📤 请求结构体: 包含model、input、parameters等字段');
      console.log('- ❌ 错误结构体: 包含status、statusText、errorBody等字段');
      return;
    }

    const result = await ocrResponse.json();
    console.log(`📥 [${getTimestamp()}] OCR响应:`, {
      success: result.success,
      count: result.count,
      processedImages: result.processedImages,
      requestId: result.requestId
    });

    if (result.success && result.data && result.data.length > 0) {
      console.log('\n🎉 OCR识别成功！');
      console.log(`📊 识别统计:`);
      console.log(`- 总人数: ${result.data.length}`);
      console.log(`- 处理时间: ${(duration/1000).toFixed(1)}秒`);
      
      console.log('\n📋 后端应该已打印以下JSON结构体:');
      console.log('- 📤 请求结构体: 包含完整的千问API请求参数');
      console.log('- 📥 返回结构体: 包含完整的千问API响应数据');
      console.log('- 📊 响应摘要: 包含hasOutput、hasChoices、usage等字段');
      
      console.log('\n👥 识别到的人物（前3个）:');
      result.data.slice(0, 3).forEach((person, index) => {
        console.log(`${index + 1}. ${person.name} (第${person.g_rank}代, ID:${person.id})`);
      });
      
    } else {
      console.warn('⚠️ OCR识别返回空结果');
      console.log('\n📋 后端应该已打印以下JSON结构体:');
      console.log('- 📤 请求结构体: 包含完整的千问API请求参数');
      console.log('- 📥 返回结构体: 包含千问API的空响应或错误响应');
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ [${getTimestamp()}] OCR测试失败:`, error.message);
    console.error(`⏱️ 失败时间: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
    
    console.log('\n📋 后端应该已打印以下JSON结构体:');
    console.log('- 📤 请求结构体: 包含完整的千问API请求参数');
    console.log('- ❌ 网络错误结构体: 包含name、message、code、stack等字段');
    
    if (error.name === 'FetchError' && error.message.includes('timeout')) {
      console.error('⏰ 检测到超时错误');
      console.log('💡 这种情况下后端会打印网络错误的完整JSON结构体');
    } else {
      console.error('💡 其他网络错误，后端会打印相应的错误JSON结构体');
    }
  }

  console.log('\n🏁 JSON日志测试完成');
  console.log('\n📋 验证要点:');
  console.log('✅ 检查后端控制台是否打印了完整的请求结构体JSON');
  console.log('✅ 检查后端控制台是否打印了完整的返回结构体JSON');
  console.log('✅ 检查JSON格式是否正确（缩进、可读性）');
  console.log('✅ 检查是否包含所有必要的字段信息');
  console.log('✅ 检查错误情况下是否打印了错误结构体JSON');
}

// 获取精简时间戳
function getTimestamp() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

// 运行测试
testJSONLogging().catch(console.error);
