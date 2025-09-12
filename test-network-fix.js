/**
 * 测试网络连接修复后的效果
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function testNetworkFix() {
  console.log('🧪 ========== 测试网络连接修复后的效果 ==========');
  console.log('🏢 后端服务:', BACKEND_URL);
  console.log('🖼️ 测试图片:', TEST_IMAGE);
  console.log('⏰ 测试时间:', new Date().toISOString());
  console.log('');

  console.log('🔧 修复内容:');
  console.log('- 移除了网络连接预测试（避免404干扰）');
  console.log('- 直接调用千问API');
  console.log('- 应该能够正常获得响应');
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

  // 2. 测试OCR接口（修复后应该能正常工作）
  console.log('\n2️⃣ 测试OCR接口（修复后）...');
  console.log('📋 预期行为:');
  console.log('- 跳过网络预测试');
  console.log('- 直接调用千问API');
  console.log('- 在10秒左右返回结果（类似Postman）');
  console.log('- 不会因为404状态码而卡住');
  console.log('');

  try {
    const startTime = Date.now();
    console.log(`📤 [${getTimestamp()}] 发送OCR请求...`);
    console.log('💡 请观察后端控制台，应该看到"跳过网络预测试"的日志');
    
    const ocrResponse = await fetch(`${BACKEND_URL}/api/qwen/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: [TEST_IMAGE],
        tenantId: 'network-fix-test'
      }),
      timeout: 120000 // 120秒超时
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
      
      if (errorData.message && errorData.message.includes('超时')) {
        console.error('⏰ 仍然出现超时错误');
        console.error('💡 可能的原因:');
        console.error('   1. API Key问题');
        console.error('   2. 网络连接问题');
        console.error('   3. 千问API服务问题');
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
      console.log('\n🎉 OCR识别成功！修复生效！');
      console.log(`📊 识别统计:`);
      console.log(`- 总人数: ${result.data.length}`);
      console.log(`- 处理时间: ${(duration/1000).toFixed(1)}秒`);
      
      if (duration < 15000) {
        console.log('✅ 响应时间正常（小于15秒），修复成功！');
      } else if (duration < 30000) {
        console.log('⚠️ 响应时间较长但可接受（15-30秒）');
      } else {
        console.log('⚠️ 响应时间较长（超过30秒），可能还有其他问题');
      }
      
      console.log('\n👥 识别到的人物（前3个）:');
      result.data.slice(0, 3).forEach((person, index) => {
        console.log(`${index + 1}. ${person.name} (第${person.g_rank}代, ID:${person.id})`);
      });
      
      console.log('\n✅ 网络连接修复验证成功！');
      console.log('📋 修复效果:');
      console.log('- 移除了干扰性的网络预测试');
      console.log('- API调用响应时间正常');
      console.log('- 成功获得识别结果');
      
    } else {
      console.warn('⚠️ OCR识别返回空结果');
      console.log('💡 虽然返回空结果，但响应时间正常，说明网络连接修复生效');
      console.log(`📊 响应时间: ${(duration/1000).toFixed(1)}秒`);
      
      if (duration < 15000) {
        console.log('✅ 网络连接修复成功，响应时间正常');
      }
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ [${getTimestamp()}] OCR测试失败:`, error.message);
    console.error(`⏱️ 失败时间: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
    
    if (error.name === 'FetchError' && error.message.includes('timeout')) {
      console.error('⏰ 仍然出现超时错误');
      console.error('💡 可能的原因:');
      console.error('   1. 后端服务问题');
      console.error('   2. API Key配置问题');
      console.error('   3. 千问API服务问题');
      console.error('   4. 网络连接问题（需要VPN）');
    } else {
      console.error('💡 其他错误，请检查后端日志');
    }
  }

  console.log('\n🏁 网络连接修复测试完成');
  console.log('\n📋 对比分析:');
  console.log('🔧 修复前: 网络预测试返回404 → 可能干扰API调用 → 超时');
  console.log('✅ 修复后: 跳过预测试 → 直接调用API → 正常响应');
  console.log('\n💡 如果仍有问题，请检查:');
  console.log('1. API Key是否正确配置');
  console.log('2. 网络连接是否稳定');
  console.log('3. 是否需要使用VPN');
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
testNetworkFix().catch(console.error);
