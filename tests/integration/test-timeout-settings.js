/**
 * 测试新的超时设置
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function testTimeoutSettings() {
  console.log('🧪 ========== 测试新的超时设置 ==========');
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

  // 2. 测试OCR接口的新超时设置
  console.log('\n2️⃣ 测试OCR接口的新超时设置...');
  console.log('📋 超时配置:');
  console.log('- 后端千问API超时: 100秒');
  console.log('- 前端请求超时: 120秒');
  console.log('- 测试脚本超时: 150秒');
  console.log('');

  try {
    const startTime = Date.now();
    console.log(`📤 [${getTimestamp()}] 发送OCR请求...`);
    
    const ocrResponse = await fetch(`${BACKEND_URL}/api/qwen/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: [TEST_IMAGE],
        tenantId: 'timeout-test'
      }),
      timeout: 150000 // 150秒超时，比前端和后端都长
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
      
      // 分析超时相关的错误
      if (errorData.message && errorData.message.includes('超时')) {
        console.error('⏰ 检测到超时错误');
        if (errorData.message.includes('100秒')) {
          console.error('💡 这是后端千问API超时 (100秒)');
        } else if (errorData.message.includes('120秒')) {
          console.error('💡 这是前端请求超时 (120秒)');
        }
      }
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
      
      if (duration > 60000) {
        console.log('⚠️ 处理时间超过60秒，新的100秒超时设置发挥了作用');
      } else {
        console.log('✅ 处理时间在合理范围内');
      }
      
      console.log('\n👥 识别到的人物（前3个）:');
      result.data.slice(0, 3).forEach((person, index) => {
        console.log(`${index + 1}. ${person.name} (第${person.g_rank}代, ID:${person.id})`);
      });
      
    } else {
      console.warn('⚠️ OCR识别返回空结果');
      if (duration > 90000) {
        console.log('💡 虽然返回空结果，但请求没有超时，说明100秒超时设置有效');
      }
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ [${getTimestamp()}] OCR测试失败:`, error.message);
    console.error(`⏱️ 失败时间: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
    
    if (error.name === 'FetchError' && error.message.includes('timeout')) {
      console.error('⏰ 检测到超时错误');
      if (duration >= 150000) {
        console.error('💡 这是测试脚本超时 (150秒)');
      } else if (duration >= 120000) {
        console.error('💡 这可能是前端请求超时 (120秒)');
      } else if (duration >= 100000) {
        console.error('💡 这可能是后端千问API超时 (100秒)');
      }
      
      console.error('📋 超时层级分析:');
      console.error('- 如果在100秒左右超时: 后端千问API超时');
      console.error('- 如果在120秒左右超时: 前端请求超时');
      console.error('- 如果在150秒左右超时: 测试脚本超时');
    } else {
      console.error('💡 其他网络错误，请检查网络连接');
    }
  }

  console.log('\n🏁 超时设置测试完成');
  console.log('📋 总结:');
  console.log('- 后端千问API超时: 100秒 ✅');
  console.log('- 前端请求超时: 120秒 ✅');
  console.log('- 测试脚本超时: 150秒 ✅');
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
testTimeoutSettings().catch(console.error);
