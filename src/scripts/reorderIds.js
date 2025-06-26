/**
 * 重新整理家谱数据的ID，使其连续
 */

const fs = require('fs');
const path = require('path');

// 读取家谱数据
const dataPath = path.join(__dirname, '../data/familyData.js');
const content = fs.readFileSync(dataPath, 'utf8');
const arrayMatch = content.match(/const dbJson = (\[[\s\S]*?\]);/);

if (!arrayMatch) {
  console.error('无法解析家谱数据');
  process.exit(1);
}

const data = JSON.parse(arrayMatch[1]);

console.log('=== 开始重新整理ID ===');
console.log('原始数据:', data.length, '人');
console.log('原始ID范围:', Math.min(...data.map(p => p.id)), '-', Math.max(...data.map(p => p.id)));

// 创建ID映射表
const oldToNewIdMap = new Map();
const newToOldIdMap = new Map();

// 按原始ID排序，然后分配新的连续ID
const sortedData = [...data].sort((a, b) => a.id - b.id);
sortedData.forEach((person, index) => {
  const newId = index + 1;
  oldToNewIdMap.set(person.id, newId);
  newToOldIdMap.set(newId, person.id);
});

console.log('ID映射表创建完成');

// 更新所有人员的ID和父亲ID
const updatedData = data.map(person => {
  const newId = oldToNewIdMap.get(person.id);
  let newFatherId = person.g_father_id;
  
  // 更新父亲ID（如果不是根节点）
  if (person.g_father_id && person.g_father_id !== 0) {
    newFatherId = oldToNewIdMap.get(person.g_father_id);
    if (!newFatherId) {
      console.warn(`警告: 找不到父亲ID ${person.g_father_id} 的映射 (人员: ${person.name})`);
      newFatherId = person.g_father_id; // 保持原值
    }
  }
  
  return {
    ...person,
    id: newId,
    g_father_id: newFatherId
  };
});

// 按新ID排序
updatedData.sort((a, b) => a.id - b.id);

console.log('数据更新完成');
console.log('新ID范围:', Math.min(...updatedData.map(p => p.id)), '-', Math.max(...updatedData.map(p => p.id)));

// 验证数据完整性
console.log('\n=== 数据完整性验证 ===');

// 检查ID连续性
const newIds = updatedData.map(p => p.id).sort((a, b) => a - b);
let isConsecutive = true;
for (let i = 0; i < newIds.length; i++) {
  if (newIds[i] !== i + 1) {
    console.error(`ID不连续: 期望${i + 1}, 实际${newIds[i]}`);
    isConsecutive = false;
  }
}

if (isConsecutive) {
  console.log('✅ ID连续性检查通过');
} else {
  console.log('❌ ID连续性检查失败');
}

// 检查父子关系
let relationshipErrors = 0;
updatedData.forEach(person => {
  if (person.g_father_id && person.g_father_id !== 0) {
    const father = updatedData.find(p => p.id === person.g_father_id);
    if (!father) {
      console.error(`父子关系错误: ${person.name} (ID: ${person.id}) 的父亲ID ${person.g_father_id} 不存在`);
      relationshipErrors++;
    }
  }
});

if (relationshipErrors === 0) {
  console.log('✅ 父子关系检查通过');
} else {
  console.log(`❌ 父子关系检查失败: ${relationshipErrors} 个错误`);
}

// 生成新的文件内容
const newFileContent = `const dbJson = ${JSON.stringify(updatedData, null, '\t')};

export default dbJson;`;

// 备份原文件
const backupPath = dataPath + '.backup.' + Date.now();
fs.copyFileSync(dataPath, backupPath);
console.log(`原文件已备份到: ${backupPath}`);

// 写入新文件
fs.writeFileSync(dataPath, newFileContent, 'utf8');
console.log(`新文件已写入: ${dataPath}`);

console.log('\n=== ID重新整理完成 ===');
console.log('总人数:', updatedData.length);
console.log('新ID范围: 1 -', updatedData.length);
console.log('缺失ID数量: 0');

// 显示一些映射示例
console.log('\n=== ID映射示例 ===');
const examples = [
  { old: 1, name: '穆茂' },
  { old: 288, name: '穆维墀（chi）' },
  { old: 354, name: '穆维章' },
  { old: 691, name: '穆然' }
];

examples.forEach(example => {
  const newId = oldToNewIdMap.get(example.old);
  if (newId) {
    console.log(`${example.name}: ${example.old} -> ${newId}`);
  }
});
