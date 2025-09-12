/**
 * 调试千问API的原始响应
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function debugQwenResponse() {
  console.log('🔍 ========== 调试千问API原始响应 ==========');
  console.log('🏢 后端服务:', BACKEND_URL);
  console.log('🖼️ 测试图片:', TEST_IMAGE);
  console.log('⏰ 测试时间:', new Date().toISOString());
  console.log('');

  console.log('🎯 调试目标:');
  console.log('- 查看千问API的完整请求结构体');
  console.log('- 查看千问API的完整返回结构体');
  console.log('- 分析为什么返回空数组');
  console.log('- 检查JSON解析过程');
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

  // 2. 发送OCR请求并观察后端日志
  console.log('\n2️⃣ 发送OCR请求...');
  console.log('💡 请同时观察后端控制台的详细日志输出');
  console.log('💡 特别关注以下日志:');
  console.log('   - 📤 请求结构体: 完整的千问API请求JSON');
  console.log('   - 📥 返回结构体: 完整的千问API响应JSON');
  console.log('   - 🔍 解析过程: JSON解析的详细步骤');
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
        tenantId: 'debug-qwen-response'
      }),
      timeout: 120000
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
      return;
    }

    const result = await ocrResponse.json();
    
    // 3. 分析后端返回的结果
    console.log('\n3️⃣ 分析后端返回的结果...');
    console.log('📥 完整的后端响应:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n📊 响应结构分析:');
    console.log(`- success: ${result.success}`);
    console.log(`- count: ${result.count}`);
    console.log(`- processedImages: ${result.processedImages}`);
    console.log(`- requestId: ${result.requestId}`);
    console.log(`- data类型: ${Array.isArray(result.data) ? 'Array' : typeof result.data}`);
    console.log(`- data长度: ${result.data?.length || 0}`);

    // 4. 分析可能的问题
    console.log('\n4️⃣ 分析可能的问题...');
    
    if (result.success && result.data && Array.isArray(result.data)) {
      if (result.data.length === 0) {
        console.log('⚠️ 问题分析: 返回空数组');
        console.log('可能的原因:');
        console.log('1. 千问API识别不到图片中的人物信息');
        console.log('2. 千问API返回的内容格式不符合JSON解析要求');
        console.log('3. JSON解析过程中出现错误，回退到空数组');
        console.log('4. 图片内容不清晰或不是家谱图片');
        console.log('5. prompt设置有问题，要求"前3个人物"但图片中人物不足3个');
        
        console.log('\n💡 调试建议:');
        console.log('1. 检查后端日志中的"📥 返回结构体"，查看千问API的原始响应');
        console.log('2. 检查后端日志中的"🔍 开始解析响应内容"，查看解析过程');
        console.log('3. 如果千问API返回了文本内容，检查是否包含有效的JSON');
        console.log('4. 考虑修改prompt，不限制人物数量');
        
      } else {
        console.log('✅ 返回了有效数据');
        console.log(`📊 数据统计: ${result.data.length} 条记录`);
        result.data.forEach((record, index) => {
          console.log(`记录 ${index + 1}: ${record.name || '未知姓名'} (ID: ${record.id})`);
        });
      }
    } else {
      console.log('❌ 响应格式异常');
      console.log('- success字段:', result.success);
      console.log('- data字段存在:', !!result.data);
      console.log('- data是数组:', Array.isArray(result.data));
    }

    // 5. 提供解决方案
    console.log('\n5️⃣ 解决方案建议...');
    
    if (result.success && result.data && result.data.length === 0) {
      console.log('🔧 针对空数组问题的解决方案:');
      console.log('');
      console.log('方案1: 修改prompt，不限制人物数量');
      console.log('将 "请以JSON数组格式返回，前3个人物信息：" 改为');
      console.log('     "请以JSON数组格式返回，所有识别到的人物信息："');
      console.log('');
      console.log('方案2: 增加容错处理');
      console.log('在prompt中添加: "如果识别到的人物少于3个，返回所有识别到的人物"');
      console.log('');
      console.log('方案3: 使用更清晰的测试图片');
      console.log('确保测试图片包含清晰可见的家谱信息');
      console.log('');
      console.log('方案4: 增加调试信息');
      console.log('在后端添加更详细的千问API响应内容日志');
    }

  } catch (error) {
    console.error(`\n❌ [${getTimestamp()}] 调试测试失败:`, error.message);
    console.error('错误详情:', error);
  }

  console.log('\n🏁 千问API响应调试完成');
  console.log('\n📋 下一步行动:');
  console.log('1. 查看后端控制台的详细日志');
  console.log('2. 根据日志分析千问API的实际响应内容');
  console.log('3. 根据分析结果调整prompt或处理逻辑');
  console.log('4. 重新测试验证修复效果');
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

// 运行调试
debugQwenResponse().catch(console.error);
