#!/usr/bin/env node

/**
 * OCR数据生成测试脚本
 * 用于验证OCR识别和数据格式
 */

// 模拟OCR服务的数据生成逻辑
class MockOCRService {
  generateTenantId(tenantId, timestamp) {
    const hash = this.hashCode(`${tenantId}_${timestamp}`);
    return Math.abs(hash);
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  getMockOCRData(imageCount, tenantId) {
    const mockData = [];
    const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴'];
    const givenNames = ['明', '华', '强', '伟', '芳', '娟', '敏', '静', '丽', '勇'];
    const positions = ['', '知县', '举人', '秀才', '贡生', '廪生', '监生', '生员'];
    
    for (let i = 0; i < Math.min(imageCount * 3, 10); i++) {
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      
      mockData.push({
        id: this.generateTenantId(tenantId, Date.now() + i),
        name: `${surname}${givenName}`,
        g_rank: Math.floor(Math.random() * 5) + 1,
        rank_index: i + 1,
        g_father_id: i > 0 ? mockData[Math.floor(Math.random() * i)]?.id || 0 : 0,
        official_position: position,
        summary: position ? `${position}，为官清廉，深受百姓爱戴。` : null,
        adoption: 'none',
        sex: Math.random() > 0.5 ? 'MAN' : 'WOMAN',
        g_mother_id: null,
        birth_date: null,
        id_card: null,
        face_img: null,
        photos: null,
        household_info: null,
        spouse: null,
        home_page: null,
        dealth: Math.random() > 0.7 ? 'dealth' : null,
        formal_name: null,
        location: null,
        childrens: null,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    return mockData;
  }
}

// 验证数据格式
function validateFamilyData(data) {
  const requiredFields = [
    'id', 'name', 'g_rank', 'rank_index', 'g_father_id', 
    'official_position', 'adoption', 'sex', 'tenant_id'
  ];
  
  const issues = [];
  
  if (!Array.isArray(data)) {
    issues.push('数据不是数组格式');
    return { valid: false, issues };
  }
  
  if (data.length === 0) {
    issues.push('数据数组为空');
    return { valid: false, issues };
  }
  
  data.forEach((record, index) => {
    requiredFields.forEach(field => {
      if (!record.hasOwnProperty(field)) {
        issues.push(`记录 ${index + 1} 缺少字段: ${field}`);
      }
    });
    
    // 验证数据类型
    if (typeof record.name !== 'string' || record.name.trim() === '') {
      issues.push(`记录 ${index + 1} 姓名无效`);
    }
    
    if (!['MAN', 'WOMAN'].includes(record.sex)) {
      issues.push(`记录 ${index + 1} 性别值无效: ${record.sex}`);
    }
    
    if (typeof record.g_rank !== 'number' || record.g_rank < 1) {
      issues.push(`记录 ${index + 1} 世代值无效: ${record.g_rank}`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
    recordCount: data.length
  };
}

// 主测试函数
async function testOCRDataGeneration() {
  console.log('🧪 开始OCR数据生成测试...\n');
  
  const ocrService = new MockOCRService();
  const tenantId = 'test_tenant';
  const imageCount = 2;
  
  try {
    // 1. 生成测试数据
    console.log('1️⃣ 生成测试数据...');
    console.log(`   图片数量: ${imageCount}`);
    console.log(`   租户ID: ${tenantId}`);
    
    const startTime = Date.now();
    const mockData = ocrService.getMockOCRData(imageCount, tenantId);
    const duration = Date.now() - startTime;
    
    console.log(`✅ 数据生成完成 (耗时: ${duration}ms)`);
    console.log(`📊 生成记录数: ${mockData.length}\n`);
    
    // 2. 验证数据格式
    console.log('2️⃣ 验证数据格式...');
    const validation = validateFamilyData(mockData);
    
    if (validation.valid) {
      console.log('✅ 数据格式验证通过');
      console.log(`📋 记录总数: ${validation.recordCount}`);
    } else {
      console.log('❌ 数据格式验证失败:');
      validation.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    console.log();
    
    // 3. 显示数据示例
    console.log('3️⃣ 数据示例:');
    if (mockData.length > 0) {
      console.log('第一条记录:');
      console.log(JSON.stringify(mockData[0], null, 2));
      
      if (mockData.length > 1) {
        console.log('\n第二条记录:');
        console.log(JSON.stringify(mockData[1], null, 2));
      }
    }
    
    console.log();
    
    // 4. 统计分析
    console.log('4️⃣ 数据统计:');
    const stats = {
      totalRecords: mockData.length,
      maleCount: mockData.filter(r => r.sex === 'MAN').length,
      femaleCount: mockData.filter(r => r.sex === 'WOMAN').length,
      withPosition: mockData.filter(r => r.official_position).length,
      deceased: mockData.filter(r => r.dealth === 'dealth').length,
      generations: [...new Set(mockData.map(r => r.g_rank))].sort()
    };
    
    console.log(`   总记录数: ${stats.totalRecords}`);
    console.log(`   男性: ${stats.maleCount}, 女性: ${stats.femaleCount}`);
    console.log(`   有职位: ${stats.withPosition}`);
    console.log(`   已故: ${stats.deceased}`);
    console.log(`   世代分布: ${stats.generations.join(', ')}`);
    
    console.log('\n🎉 OCR数据生成测试完成！');
    
    // 5. 输出用于前端测试的JSON
    console.log('\n📋 用于前端测试的JSON数据:');
    console.log('```json');
    console.log(JSON.stringify(mockData, null, 2));
    console.log('```');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testOCRDataGeneration();
}

module.exports = { MockOCRService, validateFamilyData };
