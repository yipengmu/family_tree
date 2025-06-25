/**
 * 数据刷新工具
 * 根据dbjson.js重新生成queryTree.txt和oneTree.json.txt
 */

const fs = require('fs');
const path = require('path');

// 导入真实数据
let dbJson;
try {
  // 尝试读取文件内容并解析
  const fs = require('fs');
  const path = require('path');
  const dbJsonPath = path.join(__dirname, '../common/dbjson.js');
  const content = fs.readFileSync(dbJsonPath, 'utf8');

  // 提取数组部分
  const arrayMatch = content.match(/const dbJson = (\[[\s\S]*?\]);/);
  if (arrayMatch) {
    dbJson = JSON.parse(arrayMatch[1]);
  } else {
    throw new Error('无法解析dbjson.js文件');
  }
} catch (error) {
  console.error('读取dbjson.js失败:', error);
  process.exit(1);
}

/**
 * 提取指定代数的人员数据
 * @param {Array} data - 完整家谱数据
 * @param {Array} generations - 要提取的代数数组，如[19, 20]
 * @returns {Array} - 提取的人员数据
 */
function extractGenerations(data, generations) {
  return data.filter(person => generations.includes(person.g_rank));
}

/**
 * 生成查询树格式的数据
 * @param {Array} data - 家谱数据
 * @returns {String} - 查询树格式的文本
 */
function generateQueryTree(data) {
  let result = '# 家谱查询树 - 基于dbjson.js真实数据\n\n';
  
  // 按代数分组
  const generationGroups = {};
  data.forEach(person => {
    const gen = person.g_rank;
    if (!generationGroups[gen]) {
      generationGroups[gen] = [];
    }
    generationGroups[gen].push(person);
  });
  
  // 按代数排序输出
  Object.keys(generationGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(gen => {
    result += `## 第${gen}代\n\n`;
    
    generationGroups[gen].forEach(person => {
      result += `### ${person.name} (ID: ${person.id})\n`;
      result += `- 代数: 第${person.g_rank}代\n`;
      result += `- 排行: 第${person.rank_index}\n`;
      result += `- 父亲ID: ${person.g_father_id || '无'}\n`;
      result += `- 性别: ${person.sex === 'MAN' ? '男' : '女'}\n`;
      result += `- 生存状态: ${person.dealth === 'alive' ? '在世' : '已故'}\n`;
      if (person.official_position) {
        result += `- 职位: ${person.official_position}\n`;
      }
      if (person.summary) {
        result += `- 简介: ${person.summary}\n`;
      }
      result += '\n';
    });
    
    result += '\n';
  });
  
  return result;
}

/**
 * 生成单一树JSON格式的数据
 * @param {Array} data - 家谱数据
 * @returns {String} - JSON格式的文本
 */
function generateOneTreeJson(data) {
  // 转换为标准格式
  const treeData = data.map(person => ({
    id: person.id,
    name: person.name,
    g_rank: person.g_rank,
    rank_index: person.rank_index,
    g_father_id: person.g_father_id,
    official_position: person.official_position || '',
    summary: person.summary || '',
    adoption: person.adoption || 'none',
    sex: person.sex,
    g_mother_id: person.g_mother_id,
    birth_date: person.birth_date,
    id_card: person.id_card,
    face_img: person.face_img,
    photos: person.photos,
    household_info: person.household_info,
    spouse: person.spouse,
    home_page: person.home_page,
    dealth: person.dealth || 'dealth', // 默认已故，但19-20代多为alive
    formal_name: person.formal_name,
    location: person.location,
    childrens: person.childrens
  }));
  
  return JSON.stringify(treeData, null, 2);
}

/**
 * 主函数：刷新所有数据文件
 */
function refreshAllData() {
  console.log('🔄 开始刷新数据文件...');
  
  // 提取19代和20代数据
  const modernGenerations = extractGenerations(dbJson, [19, 20]);
  console.log(`📊 提取到 ${modernGenerations.length} 条现代家族成员数据`);
  
  // 统计生存状态
  const aliveCount = modernGenerations.filter(p => p.dealth === 'alive').length;
  const deathCount = modernGenerations.filter(p => p.dealth === 'dealth').length;
  console.log(`👥 生存状态统计: ${aliveCount} 人在世, ${deathCount} 人已故`);
  
  // 生成queryTree.txt
  const queryTreeContent = generateQueryTree(modernGenerations);
  const queryTreePath = path.join(__dirname, '../common/queryTree.txt');
  fs.writeFileSync(queryTreePath, queryTreeContent, 'utf8');
  console.log('✅ queryTree.txt 已更新');
  
  // 生成oneTree.json.txt
  const oneTreeContent = generateOneTreeJson(modernGenerations);
  const oneTreePath = path.join(__dirname, '../common/oneTree.json.txt');
  fs.writeFileSync(oneTreePath, oneTreeContent, 'utf8');
  console.log('✅ oneTree.json.txt 已更新');
  
  // 生成完整数据的备份
  const fullTreeContent = generateOneTreeJson(dbJson);
  const fullTreePath = path.join(__dirname, '../common/fullTree.json.txt');
  fs.writeFileSync(fullTreePath, fullTreeContent, 'utf8');
  console.log('✅ fullTree.json.txt (完整数据备份) 已创建');
  
  console.log('🎉 数据刷新完成！');
  
  return {
    modernGenerations,
    aliveCount,
    deathCount,
    totalRecords: dbJson.length
  };
}

// 如果直接运行此文件
if (require.main === module) {
  refreshAllData();
}

module.exports = {
  extractGenerations,
  generateQueryTree,
  generateOneTreeJson,
  refreshAllData
};
