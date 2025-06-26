/**
 * 数据简化工具
 * 用于简化家谱数据结构，减少冗余字段
 */

/**
 * 简化单个家族成员数据
 * @param {Object} member - 原始成员数据
 * @returns {Object} - 简化后的成员数据
 */
export const simplifyMember = (member) => {
  const simplified = {
    id: member.id,
    name: member.name,
    g_rank: member.g_rank,
    rank_index: member.rank_index,
    g_father_id: member.g_father_id,
    sex: member.sex,
    dealth: member.dealth
  };

  // 只保留有值的可选字段
  if (member.official_position && member.official_position.trim()) {
    simplified.official_position = member.official_position;
  }

  if (member.summary && member.summary.trim()) {
    simplified.summary = member.summary;
  }

  if (member.birth_date) {
    simplified.birth_date = member.birth_date;
  }

  if (member.location && member.location.trim()) {
    simplified.location = member.location;
  }

  if (member.spouse && member.spouse.trim()) {
    simplified.spouse = member.spouse;
  }

  if (member.formal_name && member.formal_name.trim()) {
    simplified.formal_name = member.formal_name;
  }

  return simplified;
};

/**
 * 简化家族数据数组
 * @param {Array} familyData - 原始家族数据
 * @returns {Array} - 简化后的家族数据
 */
export const simplifyFamilyData = (familyData) => {
  return familyData.map(simplifyMember);
};

/**
 * 计算数据压缩率
 * @param {Array} originalData - 原始数据
 * @param {Array} simplifiedData - 简化数据
 * @returns {Object} - 压缩统计信息
 */
export const getCompressionStats = (originalData, simplifiedData) => {
  const originalSize = JSON.stringify(originalData).length;
  const simplifiedSize = JSON.stringify(simplifiedData).length;
  const compressionRatio = ((originalSize - simplifiedSize) / originalSize * 100).toFixed(1);

  return {
    originalSize,
    simplifiedSize,
    savedBytes: originalSize - simplifiedSize,
    compressionRatio: `${compressionRatio}%`,
    originalCount: originalData.length,
    simplifiedCount: simplifiedData.length
  };
};

/**
 * 生成简化数据的文件内容
 * @param {Array} simplifiedData - 简化后的数据
 * @param {Object} stats - 压缩统计信息
 * @returns {string} - 文件内容
 */
export const generateSimplifiedFileContent = (simplifiedData, stats) => {
  const header = `/**
 * 简化的家谱数据
 * 生成时间: ${new Date().toISOString()}
 * 原始大小: ${stats.originalSize} bytes
 * 简化大小: ${stats.simplifiedSize} bytes
 * 压缩率: ${stats.compressionRatio}
 * 记录数: ${stats.simplifiedCount}
 */

`;

  return header + JSON.stringify(simplifiedData, null, 2);
};

/**
 * 验证简化数据的完整性
 * @param {Array} originalData - 原始数据
 * @param {Array} simplifiedData - 简化数据
 * @returns {Object} - 验证结果
 */
export const validateSimplifiedData = (originalData, simplifiedData) => {
  const issues = [];
  
  // 检查记录数量
  if (originalData.length !== simplifiedData.length) {
    issues.push(`记录数量不匹配: 原始${originalData.length}, 简化${simplifiedData.length}`);
  }

  // 检查必要字段
  const requiredFields = ['id', 'name', 'g_rank', 'rank_index', 'g_father_id', 'sex', 'dealth'];
  
  simplifiedData.forEach((member, index) => {
    requiredFields.forEach(field => {
      if (member[field] === undefined) {
        issues.push(`记录${index + 1} (ID: ${member.id}) 缺少必要字段: ${field}`);
      }
    });
  });

  // 检查ID唯一性
  const ids = simplifiedData.map(m => m.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    issues.push('存在重复的ID');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};
