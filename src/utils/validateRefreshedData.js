/**
 * 验证刷新后的数据
 */

const fs = require('fs');
const path = require('path');

function validateRefreshedData() {
  console.log('🔍 开始验证刷新后的数据...\n');
  
  // 直接从主数据源读取数据
  const dbJsonPath = path.join(__dirname, '../data/familyData.js');
  const dbJsonContent = fs.readFileSync(dbJsonPath, 'utf8');
  const arrayMatch = dbJsonContent.match(/const familyData = (\[[\s\S]*?\]);/);
  const allData = arrayMatch ? JSON.parse(arrayMatch[1]) : [];

  // 筛选19-20代数据
  const oneTreeData = allData.filter(person => person.g_rank >= 19 && person.g_rank <= 20);
  
  console.log('📊 数据概览:');
  console.log(`- 总记录数: ${oneTreeData.length}`);
  
  // 按代数分组
  const gen19 = oneTreeData.filter(p => p.g_rank === 19);
  const gen20 = oneTreeData.filter(p => p.g_rank === 20);
  
  console.log(`- 第19代: ${gen19.length} 人`);
  console.log(`- 第20代: ${gen20.length} 人\n`);
  
  // 验证第19代
  console.log('👥 第19代详情:');
  gen19.forEach(person => {
    const status = person.dealth === 'alive' ? '在世' : '已故';
    const gender = person.sex === 'MAN' ? '男' : '女';
    console.log(`  ${person.name} (ID: ${person.id}) - ${gender}, ${status}`);
  });
  
  console.log('\n👥 第20代详情:');
  gen20.forEach(person => {
    const status = person.dealth === 'alive' ? '在世' : '已故';
    const gender = person.sex === 'MAN' ? '男' : '女';
    console.log(`  ${person.name} (ID: ${person.id}) - ${gender}, ${status}`);
  });
  
  // 统计生存状态
  const aliveCount = oneTreeData.filter(p => p.dealth === 'alive').length;
  const deathCount = oneTreeData.filter(p => p.dealth === 'dealth').length;
  
  console.log('\n📈 生存状态统计:');
  console.log(`- 在世: ${aliveCount} 人 (${Math.round(aliveCount/oneTreeData.length*100)}%)`);
  console.log(`- 已故: ${deathCount} 人 (${Math.round(deathCount/oneTreeData.length*100)}%)`);
  
  // 验证穆毅鹏的信息
  const muYiPeng = oneTreeData.find(p => p.name === '穆毅鹏');
  if (muYiPeng) {
    console.log('\n🎯 当前用户 (穆毅鹏) 信息:');
    console.log(`- ID: ${muYiPeng.id}`);
    console.log(`- 代数: 第${muYiPeng.g_rank}代`);
    console.log(`- 排行: 第${muYiPeng.rank_index}`);
    console.log(`- 父亲ID: ${muYiPeng.g_father_id}`);
    console.log(`- 生存状态: ${muYiPeng.dealth === 'alive' ? '在世' : '已故'}`);
  }
  
  // 验证父子关系
  console.log('\n🔗 父子关系验证:');
  const fatherIds = [...new Set(oneTreeData.map(p => p.g_father_id).filter(id => id))];
  const personIds = new Set(oneTreeData.map(p => p.id));
  
  let validRelations = 0;
  let invalidRelations = 0;
  
  oneTreeData.forEach(person => {
    if (person.g_father_id && person.g_father_id !== 0) {
      if (personIds.has(person.g_father_id)) {
        validRelations++;
      } else {
        invalidRelations++;
        console.log(`  ⚠️ ${person.name} (ID: ${person.id}) 的父亲ID ${person.g_father_id} 在当前数据中不存在`);
      }
    }
  });
  
  console.log(`- 有效父子关系: ${validRelations}`);
  console.log(`- 无效父子关系: ${invalidRelations}`);
  
  // 验证数据源文件完整性
  console.log('\n📁 数据源验证:');
  const dataFiles = [
    'src/data/familyData.js'
  ];

  dataFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', '..', file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`  ✅ ${file} (${Math.round(stats.size/1024)}KB)`);
    } else {
      console.log(`  ❌ ${file} 不存在`);
    }
  });
  
  console.log('\n✅ 数据验证完成!');
  
  return {
    totalRecords: oneTreeData.length,
    gen19Count: gen19.length,
    gen20Count: gen20.length,
    aliveCount,
    deathCount,
    validRelations,
    invalidRelations,
    currentUser: muYiPeng
  };
}

// 如果直接运行此文件
if (require.main === module) {
  validateRefreshedData();
}

module.exports = { validateRefreshedData };
