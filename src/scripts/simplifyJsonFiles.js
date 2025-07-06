/**
 * 简化JSON文件脚本
 * 用于简化common目录中的JSON文件，减少数据冗余
 */

import fs from 'fs';
import path from 'path';
import { 
  simplifyFamilyData, 
  getCompressionStats, 
  generateSimplifiedFileContent,
  validateSimplifiedData 
} from '../utils/dataSimplifier.js';

const COMMON_DIR = path.join(process.cwd(), 'src/common');

/**
 * 读取JSON文件
 * @param {string} filePath - 文件路径
 * @returns {Array} - JSON数据
 */
const readJsonFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 读取文件失败: ${filePath}`, error.message);
    return null;
  }
};

/**
 * 写入文件
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 */
const writeFile = (filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 文件写入成功: ${filePath}`);
  } catch (error) {
    console.error(`❌ 文件写入失败: ${filePath}`, error.message);
  }
};

/**
 * 简化单个JSON文件
 * @param {string} fileName - 文件名
 */
const simplifyJsonFile = (fileName) => {
  const inputPath = path.join(COMMON_DIR, fileName);
  const outputPath = path.join(COMMON_DIR, fileName.replace('.json.txt', '.simplified.json'));
  
  console.log(`\n🔄 处理文件: ${fileName}`);
  
  // 读取原始数据
  const originalData = readJsonFile(inputPath);
  if (!originalData) {
    return;
  }

  console.log(`📊 原始数据: ${originalData.length} 条记录`);

  // 简化数据
  const simplifiedData = simplifyFamilyData(originalData);
  
  // 验证简化数据
  const validation = validateSimplifiedData(originalData, simplifiedData);
  if (!validation.isValid) {
    console.error('❌ 数据验证失败:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
    return;
  }

  // 计算压缩统计
  const stats = getCompressionStats(originalData, simplifiedData);
  console.log(`📈 压缩统计:`);
  console.log(`  - 原始大小: ${(stats.originalSize / 1024).toFixed(1)} KB`);
  console.log(`  - 简化大小: ${(stats.simplifiedSize / 1024).toFixed(1)} KB`);
  console.log(`  - 节省空间: ${(stats.savedBytes / 1024).toFixed(1)} KB`);
  console.log(`  - 压缩率: ${stats.compressionRatio}`);

  // 生成文件内容
  const fileContent = generateSimplifiedFileContent(simplifiedData, stats);
  
  // 写入简化文件
  writeFile(outputPath, fileContent);
  
  return stats;
};

/**
 * 主函数
 */
const main = () => {
  console.log('🚀 开始简化JSON文件...\n');

  // 注意：原始JSON文件已被清理，此脚本需要更新为直接处理主数据源
  console.log('⚠️ 原始JSON文件已被清理，请使用 familyDataService 进行数据处理');
  console.log('\n✅ 脚本已废弃!');
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { simplifyJsonFile, main };
