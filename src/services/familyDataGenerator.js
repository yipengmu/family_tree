/**
 * 家谱数据文件生成服务
 * 根据OCR识别结果自动生成独立的familyData-xx.js文件
 */

class FamilyDataGenerator {
  constructor() {
    this.baseDataPath = 'src/data';
  }

  /**
   * 根据OCR识别结果生成familyData文件
   * @param {Array} familyData - 家谱数据
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 生成选项
   * @returns {Promise<Object>} - 生成结果
   */
  async generateFamilyDataFile(familyData, tenantId, options = {}) {
    try {
      console.log('📝 开始生成家谱数据文件...');
      console.log('📊 数据条数:', familyData.length);
      console.log('🏢 租户ID:', tenantId);

      // 1. 验证数据
      const validationResult = this.validateFamilyData(familyData);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 2. 生成文件名
      const fileName = this.generateFileName(tenantId, options);
      console.log('📄 生成文件名:', fileName);

      // 3. 处理数据
      const processedData = this.processDataForExport(familyData, tenantId);

      // 4. 生成文件内容
      const fileContent = this.generateFileContent(processedData, tenantId, options);

      // 5. 生成元数据
      const metadata = this.generateMetadata(processedData, tenantId, fileName);

      // 6. 创建下载链接（浏览器环境）
      const downloadInfo = this.createDownloadableFile(fileContent, fileName);

      console.log('✅ 家谱数据文件生成完成');
      
      return {
        success: true,
        fileName,
        fileContent,
        metadata,
        downloadInfo,
        stats: {
          totalRecords: processedData.length,
          generations: this.getGenerationStats(processedData),
          maleCount: processedData.filter(p => p.sex === 'MAN').length,
          femaleCount: processedData.filter(p => p.sex === 'WOMAN').length,
        }
      };

    } catch (error) {
      console.error('❌ 生成家谱数据文件失败:', error);
      return {
        success: false,
        error: error.message,
        fileName: null,
        fileContent: null
      };
    }
  }

  /**
   * 生成文件名
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 选项
   * @returns {string} - 文件名
   */
  generateFileName(tenantId, options = {}) {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const suffix = options.suffix || 'ocr';
    return `familyData-${tenantId}-${suffix}-${timestamp}.js`;
  }

  /**
   * 验证家谱数据
   * @param {Array} data - 家谱数据
   * @returns {Object} - 验证结果
   */
  validateFamilyData(data) {
    const errors = [];
    
    if (!Array.isArray(data)) {
      errors.push('数据不是数组格式');
      return { isValid: false, errors };
    }

    if (data.length === 0) {
      errors.push('数据为空');
      return { isValid: false, errors };
    }

    const requiredFields = ['id', 'name', 'g_rank', 'sex'];
    
    data.forEach((item, index) => {
      requiredFields.forEach(field => {
        if (!item.hasOwnProperty(field) || item[field] === undefined) {
          errors.push(`第${index + 1}条记录缺少必需字段: ${field}`);
        }
      });

      if (typeof item.name !== 'string' || item.name.trim() === '') {
        errors.push(`第${index + 1}条记录的姓名无效`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 处理数据用于导出
   * @param {Array} data - 原始数据
   * @param {string} tenantId - 租户ID
   * @returns {Array} - 处理后的数据
   */
  processDataForExport(data, tenantId) {
    return data.map((item, index) => ({
      id: item.id || (index + 1),
      name: item.name || `未知姓名${index + 1}`,
      g_rank: item.g_rank || 1,
      rank_index: item.rank_index || (index + 1),
      g_father_id: item.g_father_id || 0,
      official_position: item.official_position || '',
      summary: item.summary || null,
      adoption: item.adoption || 'none',
      sex: item.sex || 'MAN',
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
  }

  /**
   * 生成文件内容
   * @param {Array} data - 处理后的数据
   * @param {string} tenantId - 租户ID
   * @param {Object} options - 选项
   * @returns {string} - 文件内容
   */
  generateFileContent(data, tenantId, options = {}) {
    const timestamp = new Date().toISOString();
    const stats = this.getGenerationStats(data);
    
    const header = `/**
 * 家谱数据文件 - ${tenantId}
 * 生成时间: ${timestamp}
 * 数据来源: OCR识别 (通义千问VL-Max)
 * 记录总数: ${data.length}
 * 世代分布: ${Object.keys(stats).map(g => `第${g}代(${stats[g]}人)`).join(', ')}
 */

`;

    const dataContent = `const dbJson = ${JSON.stringify(data, null, '\t')};

export default dbJson;

// 数据统计信息
export const dataStats = {
  totalRecords: ${data.length},
  tenantId: '${tenantId}',
  generatedAt: '${timestamp}',
  generations: ${JSON.stringify(stats, null, 2)},
  maleCount: ${data.filter(p => p.sex === 'MAN').length},
  femaleCount: ${data.filter(p => p.sex === 'WOMAN').length},
  withPosition: ${data.filter(p => p.official_position).length},
  deceased: ${data.filter(p => p.dealth === 'dealth').length}
};

// 辅助函数
export const getFamilyMemberById = (id) => {
  return dbJson.find(member => member.id === id);
};

export const getFamilyMembersByGeneration = (generation) => {
  return dbJson.filter(member => member.g_rank === generation);
};

export const getFamilyMembersByFather = (fatherId) => {
  return dbJson.filter(member => member.g_father_id === fatherId);
};
`;

    return header + dataContent;
  }

  /**
   * 生成元数据
   * @param {Array} data - 数据
   * @param {string} tenantId - 租户ID
   * @param {string} fileName - 文件名
   * @returns {Object} - 元数据
   */
  generateMetadata(data, tenantId, fileName) {
    return {
      fileName,
      tenantId,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      source: 'OCR识别 (通义千问VL-Max)',
      recordCount: data.length,
      generations: this.getGenerationStats(data),
      dataSchema: {
        version: '1.0',
        fields: [
          'id', 'name', 'g_rank', 'rank_index', 'g_father_id',
          'official_position', 'summary', 'adoption', 'sex',
          'g_mother_id', 'birth_date', 'id_card', 'face_img',
          'photos', 'household_info', 'spouse', 'home_page',
          'dealth', 'formal_name', 'location', 'childrens'
        ]
      }
    };
  }

  /**
   * 获取世代统计信息
   * @param {Array} data - 数据
   * @returns {Object} - 世代统计
   */
  getGenerationStats(data) {
    const stats = {};
    data.forEach(person => {
      const generation = person.g_rank || 1;
      stats[generation] = (stats[generation] || 0) + 1;
    });
    return stats;
  }

  /**
   * 创建可下载的文件
   * @param {string} content - 文件内容
   * @param {string} fileName - 文件名
   * @returns {Object} - 下载信息
   */
  createDownloadableFile(content, fileName) {
    try {
      const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      return {
        blob,
        url,
        fileName,
        size: blob.size,
        type: blob.type,
        downloadReady: true
      };
    } catch (error) {
      console.error('❌ 创建下载文件失败:', error);
      return {
        downloadReady: false,
        error: error.message
      };
    }
  }

  /**
   * 触发文件下载
   * @param {Object} downloadInfo - 下载信息
   */
  downloadFile(downloadInfo) {
    if (!downloadInfo.downloadReady) {
      console.error('❌ 文件未准备好下载');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = downloadInfo.url;
      link.download = downloadInfo.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      setTimeout(() => {
        URL.revokeObjectURL(downloadInfo.url);
      }, 1000);
      
      console.log('✅ 文件下载已触发:', downloadInfo.fileName);
    } catch (error) {
      console.error('❌ 触发文件下载失败:', error);
    }
  }

  /**
   * 批量生成多个租户的数据文件
   * @param {Array} tenantDataList - 租户数据列表
   * @returns {Promise<Array>} - 生成结果列表
   */
  async batchGenerateFiles(tenantDataList) {
    const results = [];
    
    for (const tenantData of tenantDataList) {
      const result = await this.generateFamilyDataFile(
        tenantData.data,
        tenantData.tenantId,
        tenantData.options
      );
      results.push(result);
    }
    
    return results;
  }
}

// 创建单例实例
const familyDataGenerator = new FamilyDataGenerator();

export default familyDataGenerator;
