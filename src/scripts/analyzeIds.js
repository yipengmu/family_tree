/**
 * 分析家谱数据中的ID分布
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

console.log('=== 家谱数据ID分析 ===');
console.log('总人数:', data.length);

// 获取所有ID
const ids = data.map(p => p.id).sort((a, b) => a - b);
console.log('最小ID:', ids[0]);
console.log('最大ID:', ids[ids.length - 1]);

// 检查ID连续性
const missingIds = [];
for (let i = ids[0]; i <= ids[ids.length - 1]; i++) {
  if (!ids.includes(i)) {
    missingIds.push(i);
  }
}

console.log('缺失的ID数量:', missingIds.length);
console.log('理论应有人数:', ids[ids.length - 1] - ids[0] + 1);
console.log('实际人数:', data.length);
console.log('缺失比例:', ((missingIds.length / (ids[ids.length - 1] - ids[0] + 1)) * 100).toFixed(1) + '%');

if (missingIds.length > 0) {
  console.log('\n=== 缺失的ID列表 ===');
  console.log('前50个缺失的ID:', missingIds.slice(0, 50));
  
  if (missingIds.length > 50) {
    console.log('...(还有', missingIds.length - 50, '个)');
  }
}

// 检查是否有重复ID
const duplicateIds = [];
const idCounts = {};
ids.forEach(id => {
  idCounts[id] = (idCounts[id] || 0) + 1;
  if (idCounts[id] > 1) {
    duplicateIds.push(id);
  }
});

if (duplicateIds.length > 0) {
  console.log('\n=== 重复的ID ===');
  console.log('重复ID:', [...new Set(duplicateIds)]);
}

// 分析ID分布模式
console.log('\n=== ID分布分析 ===');
const gaps = [];
for (let i = 1; i < ids.length; i++) {
  const gap = ids[i] - ids[i-1];
  if (gap > 1) {
    gaps.push({
      from: ids[i-1],
      to: ids[i],
      gap: gap - 1
    });
  }
}

console.log('ID间隙数量:', gaps.length);
if (gaps.length > 0) {
  console.log('最大间隙:', Math.max(...gaps.map(g => g.gap)));
  console.log('前10个间隙:', gaps.slice(0, 10));

// 分析间隙前后的人员信息
console.log('\n=== 间隙前后人员分析 ===');
gaps.forEach((gap, index) => {
  const beforePerson = data.find(p => p.id === gap.from);
  const afterPerson = data.find(p => p.id === gap.to);

  console.log(`间隙${index + 1}: ID ${gap.from} -> ${gap.to} (缺失${gap.gap}个)`);
  if (beforePerson) {
    console.log(`  间隙前: ${beforePerson.name} (第${beforePerson.g_rank}代)`);
  }
  if (afterPerson) {
    console.log(`  间隙后: ${afterPerson.name} (第${afterPerson.g_rank}代)`);
  }
  console.log('');
});
}
