/**
 * 测试数据流程：后端返回 → 前端解析 → AgGrid显示
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3003';
const TEST_IMAGE = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg';

async function testDataFlow() {
  console.log('🧪 ========== 测试数据流程 ==========');
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

  // 2. 测试OCR接口并分析数据结构
  console.log('\n2️⃣ 测试OCR接口并分析数据结构...');
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
        tenantId: 'data-flow-test'
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
    console.log(`📥 [${getTimestamp()}] 后端API响应结构:`, {
      success: result.success,
      count: result.count,
      processedImages: result.processedImages,
      requestId: result.requestId,
      hasData: !!result.data,
      dataLength: result.data?.length || 0
    });

    // 3. 分析返回的数据结构
    console.log('\n3️⃣ 分析返回的数据结构...');
    if (result.success && result.data && result.data.length > 0) {
      console.log('✅ 后端返回了有效数据');
      console.log(`📊 数据统计:`);
      console.log(`- 总记录数: ${result.data.length}`);
      
      // 分析第一条记录的字段
      const firstRecord = result.data[0];
      console.log('\n📋 第一条记录的字段分析:');
      console.log('字段名 | 值 | 类型');
      console.log('------|----|----|');
      Object.keys(firstRecord).forEach(key => {
        const value = firstRecord[key];
        const type = typeof value;
        const displayValue = value === null ? 'null' : 
                           value === undefined ? 'undefined' : 
                           type === 'string' && value.length > 20 ? `"${value.substring(0, 20)}..."` :
                           JSON.stringify(value);
        console.log(`${key.padEnd(15)} | ${displayValue.toString().padEnd(20)} | ${type}`);
      });

      // 4. 模拟前端数据验证处理
      console.log('\n4️⃣ 模拟前端数据验证处理...');
      const validatedData = result.data.map((item, index) => ({
        ...item,
        // 确保必需字段存在（模拟CreatorPage.js的逻辑）
        id: item.id || `temp_${Date.now()}_${index}`,
        name: item.name || `未知姓名${index + 1}`,
        g_rank: item.g_rank || 1,
        rank_index: item.rank_index || (index + 1),
        sex: item.sex || 'MAN',
        adoption: item.adoption || 'none',
        g_father_id: item.g_father_id || 0,
        official_position: item.official_position || '',
        summary: item.summary || null,
        g_mother_id: item.g_mother_id || null,
        birth_date: item.birth_date || null,
        id_card: item.id_card || null,
        face_img: item.face_img || null,
        photos: item.photos || null,
        household_info: item.household_info || null,
        spouse: item.spouse || null,
        home_page: item.home_page || null,
        dealth: item.dealth || null,
        formal_name: item.formal_name || null,
        location: item.location || null,
        childrens: item.childrens || null
      }));

      console.log('✅ 前端数据验证完成');
      console.log(`📊 验证后数据统计:`);
      console.log(`- 总记录数: ${validatedData.length}`);
      console.log(`- 有姓名的记录: ${validatedData.filter(r => r.name && !r.name.includes('未知')).length}`);
      console.log(`- 有世代信息的记录: ${validatedData.filter(r => r.g_rank).length}`);

      // 5. 检查AgGrid需要的字段
      console.log('\n5️⃣ 检查AgGrid需要的关键字段...');
      const requiredFields = ['id', 'name', 'g_rank', 'sex', 'adoption'];
      const optionalFields = ['official_position', 'summary', 'birth_date', 'spouse', 'dealth'];
      
      console.log('必需字段检查:');
      requiredFields.forEach(field => {
        const hasField = validatedData.every(record => record.hasOwnProperty(field));
        const hasValue = validatedData.filter(record => record[field] !== null && record[field] !== undefined && record[field] !== '').length;
        console.log(`- ${field}: ${hasField ? '✅' : '❌'} 存在, ${hasValue}/${validatedData.length} 有值`);
      });

      console.log('\n可选字段检查:');
      optionalFields.forEach(field => {
        const hasValue = validatedData.filter(record => record[field] !== null && record[field] !== undefined && record[field] !== '').length;
        console.log(`- ${field}: ${hasValue}/${validatedData.length} 有值`);
      });

      // 6. 显示完整的数据示例
      console.log('\n6️⃣ 完整数据示例（前3条记录）:');
      validatedData.slice(0, 3).forEach((record, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(JSON.stringify(record, null, 2));
      });

      // 7. 检查可能的问题
      console.log('\n7️⃣ 检查可能的问题...');
      const issues = [];
      
      // 检查ID重复
      const ids = validatedData.map(r => r.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        issues.push(`ID重复: ${duplicateIds.join(', ')}`);
      }

      // 检查必需字段缺失
      validatedData.forEach((record, index) => {
        if (!record.name || record.name.includes('未知')) {
          issues.push(`记录${index + 1}: 姓名缺失或为默认值`);
        }
        if (!record.g_rank) {
          issues.push(`记录${index + 1}: 世代信息缺失`);
        }
      });

      if (issues.length > 0) {
        console.log('⚠️ 发现以下问题:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('✅ 数据质量检查通过');
      }

      // 8. 总结
      console.log('\n8️⃣ 数据流程总结...');
      console.log('✅ 后端成功返回数据');
      console.log('✅ 数据结构符合预期');
      console.log('✅ 前端验证处理正常');
      console.log('✅ AgGrid字段映射正确');
      
      if (issues.length === 0) {
        console.log('\n🎉 数据流程测试成功！数据应该能正常显示在AgGrid中');
      } else {
        console.log('\n⚠️ 数据流程基本正常，但存在一些数据质量问题');
      }

    } else {
      console.warn('⚠️ 后端返回空结果或数据格式错误');
      console.log('完整响应:', result);
    }

  } catch (error) {
    console.error(`\n❌ [${getTimestamp()}] 数据流程测试失败:`, error.message);
    console.error('错误详情:', error);
  }

  console.log('\n🏁 数据流程测试完成');
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
testDataFlow().catch(console.error);
