/**
 * 网络诊断和OCR测试脚本
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function runNetworkDiagnosis() {
  console.log('🔍 ========== 网络诊断和OCR测试 ==========');
  console.log('🏢 后端服务:', BACKEND_URL);
  console.log('🖼️ 测试图片:', TEST_IMAGE);
  console.log('⏰ 测试时间:', new Date().toISOString());

  // 1. 测试基本网络连接
  console.log('\n1️⃣ 测试基本网络连接...');
  try {
    const response = await fetch('https://www.baidu.com', { 
      method: 'HEAD',
      timeout: 5000 
    });
    console.log('✅ 基本网络连接正常');
  } catch (error) {
    console.error('❌ 基本网络连接失败:', error.message);
    console.error('💡 请检查网络连接');
    return;
  }

  // 2. 测试阿里云域名解析
  console.log('\n2️⃣ 测试阿里云域名解析...');
  try {
    const response = await fetch('https://dashscope.aliyuncs.com', { 
      method: 'HEAD',
      timeout: 10000 
    });
    console.log('✅ 阿里云域名可访问，状态码:', response.status);
  } catch (error) {
    console.error('❌ 阿里云域名访问失败:', error.message);
    if (error.message.includes('timeout')) {
      console.error('💡 建议: 网络超时，可能需要使用VPN或检查防火墙设置');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 建议: DNS解析失败，请检查DNS设置');
    }
    console.error('⚠️ 继续测试后端服务...');
  }

  // 3. 测试后端健康检查
  console.log('\n3️⃣ 测试后端健康检查...');
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
    console.error('💡 请确保后端服务已启动: npm run server');
    return;
  }

  // 4. 测试图片URL可访问性
  console.log('\n4️⃣ 测试图片URL可访问性...');
  try {
    const response = await fetch(TEST_IMAGE, { 
      method: 'HEAD',
      timeout: 10000 
    });
    console.log('✅ 图片URL可访问，状态码:', response.status);
    console.log('📊 图片信息:');
    console.log('- Content-Type:', response.headers.get('content-type'));
    console.log('- Content-Length:', response.headers.get('content-length'));
  } catch (error) {
    console.error('❌ 图片URL访问失败:', error.message);
    console.error('💡 请检查OSS配置或图片URL');
  }

  // 5. 测试OCR接口（详细诊断）
  console.log('\n5️⃣ 测试OCR接口（详细诊断）...');
  try {
    const startTime = Date.now();
    
    console.log('📤 发送OCR请求...');
    const ocrResponse = await fetch(`${BACKEND_URL}/api/qwen/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: [TEST_IMAGE],
        tenantId: 'diagnosis'
      }),
      timeout: 90000 // 90秒超时
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ OCR请求总时间: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
    console.log(`📊 响应状态: ${ocrResponse.status} ${ocrResponse.statusText}`);

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json().catch(() => ({}));
      console.error('❌ OCR请求失败:', {
        status: ocrResponse.status,
        statusText: ocrResponse.statusText,
        error: errorData
      });
      
      // 根据错误类型提供建议
      if (ocrResponse.status === 500 && errorData.code === 'MISSING_API_KEY') {
        console.error('💡 解决方案: 请在.env文件中配置 REACT_APP_QWEN_API_KEY');
      } else if (ocrResponse.status === 500) {
        console.error('💡 解决方案: 服务器内部错误，请检查后端日志');
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
      console.log('\n🎉 OCR识别成功！');
      console.log(`📊 识别统计:`);
      console.log(`- 总人数: ${result.data.length}`);
      
      const generations = [...new Set(result.data.map(p => p.g_rank))].sort();
      console.log(`- 世代数: ${generations.length}`);
      console.log(`- 世代分布: ${generations.map(g => `第${g}代: ${result.data.filter(p => p.g_rank === g).length}人`).join(', ')}`);
      
      console.log('\n👥 识别到的人物（前5个）:');
      result.data.slice(0, 5).forEach((person, index) => {
        console.log(`${index + 1}. ${person.name} (第${person.g_rank}代, ID:${person.id})`);
      });
      
      if (result.data.length > 5) {
        console.log(`... 还有 ${result.data.length - 5} 个人物`);
      }
      
      console.log('\n✅ 网络诊断和OCR测试全部通过！');
      
    } else {
      console.warn('⚠️ OCR识别返回空结果');
      console.log('📋 可能的原因:');
      console.log('- 图片内容无法识别为家谱');
      console.log('- 千问API返回了非JSON格式的内容');
      console.log('- 网络问题导致API调用失败');
      console.log('\n完整响应:', result);
    }

  } catch (error) {
    console.error('\n❌ OCR测试失败:', error.message);
    console.error('错误类型:', error.constructor.name);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 解决方案: 无法连接到后端服务，请检查服务是否启动');
    } else if (error.name === 'FetchError' && error.message.includes('timeout')) {
      console.error('💡 解决方案: 请求超时，千问API响应时间过长，建议:');
      console.error('   1. 检查网络连接稳定性');
      console.error('   2. 尝试使用VPN');
      console.error('   3. 稍后重试');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('💡 解决方案: DNS解析失败，请检查网络连接和DNS设置');
    } else {
      console.error('💡 解决方案: 其他网络错误，请检查网络连接和防火墙设置');
    }
  }

  console.log('\n🏁 网络诊断完成');
}

// 运行诊断
runNetworkDiagnosis().catch(console.error);
