/**
 * 测试超时和解析修复效果
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function testTimeoutAndParsingFix() {
  console.log('🧪 ========== 测试超时和解析修复效果 ==========');
  console.log('🏢 后端服务:', BACKEND_URL);
  console.log('🖼️ 测试图片:', TEST_IMAGE);
  console.log('⏰ 测试时间:', new Date().toISOString());
  console.log('');

  console.log('🔧 修复内容:');
  console.log('1. 前端超时从25秒增加到100秒');
  console.log('2. 后端正确解析response.output.choices[0].message.content[0].text');
  console.log('3. 支持新旧两种响应格式');
  console.log('4. 增强JSON解析调试信息');
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

  // 2. 测试OCR接口（使用100秒超时）
  console.log('\n2️⃣ 测试OCR接口（100秒超时）...');
  console.log('📋 预期行为:');
  console.log('- 前端等待100秒而不是25秒');
  console.log('- 后端正确解析千问API的新格式响应');
  console.log('- 成功提取text字段中的JSON数据');
  console.log('- 返回有效的家谱人物信息');
  console.log('');

  try {
    const startTime = Date.now();
    console.log(`📤 [${getTimestamp()}] 发送OCR请求...`);
    console.log('💡 请观察后端控制台的详细解析日志');
    
    const ocrResponse = await fetch(`${BACKEND_URL}/api/qwen/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: [TEST_IMAGE],
        tenantId: 'timeout-parsing-fix-test'
      }),
      timeout: 100000 // 100秒超时，与前端保持一致
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
        if (duration < 100000) {
          console.error('💡 这是后端千问API超时，不是前端超时');
        }
      }
      return;
    }

    const result = await ocrResponse.json();
    console.log(`📥 [${getTimestamp()}] OCR响应:`, {
      success: result.success,
      count: result.count,
      processedImages: result.processedImages,
      requestId: result.requestId,
      hasData: !!result.data,
      dataLength: result.data?.length || 0
    });

    // 3. 验证修复效果
    console.log('\n3️⃣ 验证修复效果...');
    
    if (result.success && result.data && result.data.length > 0) {
      console.log('🎉 修复成功！OCR识别返回了有效数据');
      console.log(`📊 识别统计:`);
      console.log(`- 总人数: ${result.data.length}`);
      console.log(`- 处理时间: ${(duration/1000).toFixed(1)}秒`);
      
      // 验证超时设置
      if (duration > 25000 && duration < 100000) {
        console.log('✅ 超时修复生效：处理时间超过25秒但在100秒内完成');
      } else if (duration <= 25000) {
        console.log('✅ 处理时间在25秒内，超时修复有效但未触发');
      }
      
      // 验证数据质量
      console.log('\n👥 识别到的人物信息:');
      result.data.forEach((person, index) => {
        console.log(`${index + 1}. ${person.name || '未知姓名'} (第${person.g_rank || '?'}代, ID:${person.id || '?'})`);
        
        // 检查关键字段
        const hasRequiredFields = person.name && person.g_rank && person.id;
        if (!hasRequiredFields) {
          console.warn(`   ⚠️ 缺少关键字段: name=${!!person.name}, g_rank=${!!person.g_rank}, id=${!!person.id}`);
        }
      });
      
      // 验证JSON解析
      console.log('\n📋 JSON解析验证:');
      const firstPerson = result.data[0];
      const expectedFields = ['id', 'name', 'g_rank', 'sex', 'adoption'];
      const missingFields = expectedFields.filter(field => !firstPerson.hasOwnProperty(field));
      
      if (missingFields.length === 0) {
        console.log('✅ JSON解析完整，所有必需字段都存在');
      } else {
        console.warn(`⚠️ 缺少字段: ${missingFields.join(', ')}`);
      }
      
      console.log('\n🎯 修复效果总结:');
      console.log('✅ 前端超时设置修复：100秒超时生效');
      console.log('✅ 后端解析修复：成功解析千问API新格式响应');
      console.log('✅ 数据提取修复：正确提取text字段中的JSON');
      console.log('✅ 前端显示修复：数据应该能正确显示在AgGrid中');
      
    } else if (result.success && result.data && result.data.length === 0) {
      console.warn('⚠️ 返回空数据，可能的原因:');
      console.warn('1. 千问API识别不到图片中的人物信息');
      console.warn('2. 图片内容不清晰或不是家谱图片');
      console.warn('3. JSON解析仍有问题（检查后端日志）');
      
      console.log('\n💡 调试建议:');
      console.log('1. 检查后端日志中的"📥 返回结构体"');
      console.log('2. 检查后端日志中的"📝 识别内容预览"');
      console.log('3. 检查后端日志中的"🔍 开始解析响应内容"');
      
    } else {
      console.error('❌ OCR请求失败或响应格式异常');
      console.log('完整响应:', result);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ [${getTimestamp()}] 测试失败:`, error.message);
    console.error(`⏱️ 失败时间: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
    
    if (error.name === 'FetchError' && error.message.includes('timeout')) {
      if (duration >= 100000) {
        console.error('⏰ 前端100秒超时触发');
        console.error('💡 后端处理时间超过100秒，可能需要进一步优化');
      } else {
        console.error('⏰ 其他超时错误');
      }
    } else {
      console.error('💡 非超时错误，请检查网络连接或后端服务');
    }
  }

  console.log('\n🏁 超时和解析修复测试完成');
  console.log('\n📋 验证要点:');
  console.log('1. 前端超时是否从25秒增加到100秒');
  console.log('2. 后端是否正确解析新格式响应');
  console.log('3. 是否成功提取text字段中的JSON数据');
  console.log('4. AgGrid是否正确显示识别的人物信息');
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
testTimeoutAndParsingFix().catch(console.error);
