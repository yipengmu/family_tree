/**
 * OCR服务 - 集成火山引擎OCR API
 */

class OCRService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
    this.ocrEndpoint = process.env.REACT_APP_OCR_ENDPOINT || '/api/ocr';
    this.accessKeyId = process.env.REACT_APP_VOLC_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.REACT_APP_VOLC_SECRET_ACCESS_KEY;
    this.region = process.env.REACT_APP_VOLC_REGION || 'cn-north-1';
    this.volcEndpoint = process.env.REACT_APP_VOLC_OCR_ENDPOINT || 'https://visual.volcengineapi.com';
  }

  /**
   * 调用火山引擎OCR API识别图片中的家谱信息
   * @param {Array<string>} imageUrls - 图片URL数组
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 解析后的家谱数据
   */
  async recognizeFamilyTree(imageUrls, tenantId = 'default') {
    try {
      console.log('🔍 开始OCR识别，图片数量:', imageUrls.length);
      console.log('📋 图片URLs:', imageUrls);
      console.log('🏢 租户ID:', tenantId);

      // 如果是开发环境且没有配置真实的API密钥，返回模拟数据
      if (process.env.REACT_APP_ENV === 'development' && !this.accessKeyId) {
        console.log('🧪 开发环境，使用模拟OCR数据');
        const mockData = this.getMockOCRData(imageUrls.length, tenantId);
        console.log('📊 生成的模拟数据:', mockData);
        return mockData;
      }

      const response = await fetch(`${this.baseURL}${this.ocrEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          imageUrls,
          ocrType: 'family_tree',
          config: {
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey,
            region: this.region,
            endpoint: this.volcEndpoint,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`OCR API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ OCR识别完成，解析到', result.data?.length || 0, '条记录');
      console.log('📄 原始OCR结果:', result);

      const processedData = this.processOCRResult(result.data || [], tenantId);
      console.log('🔄 处理后的数据:', processedData);
      return processedData;
    } catch (error) {
      console.error('❌ OCR识别失败:', error);

      // 如果API调用失败，返回模拟数据以便开发测试
      console.log('🔄 API调用失败，使用模拟数据');
      const fallbackData = this.getMockOCRData(imageUrls.length, tenantId);
      console.log('📊 回退模拟数据:', fallbackData);
      return fallbackData;
    }
  }

  /**
   * 处理OCR识别结果，转换为标准家谱数据格式
   * @param {Array} rawData - OCR原始数据
   * @param {string} tenantId - 租户ID
   * @returns {Array} - 标准化的家谱数据
   */
  processOCRResult(rawData, tenantId) {
    return rawData.map((item, index) => ({
      id: this.generateTenantId(tenantId, Date.now() + index),
      name: item.name || `未知姓名${index + 1}`,
      g_rank: item.generation || 1,
      rank_index: item.order || index + 1,
      g_father_id: item.fatherId || 0,
      official_position: item.position || '',
      summary: item.description || null,
      adoption: item.adoption || 'none',
      sex: item.gender === '女' ? 'WOMAN' : 'MAN',
      g_mother_id: item.motherId || null,
      birth_date: item.birthDate || null,
      id_card: null,
      face_img: item.photo || null,
      photos: null,
      household_info: null,
      spouse: item.spouse || null,
      home_page: null,
      dealth: item.isAlive === false ? 'dealth' : null,
      formal_name: item.formalName || null,
      location: item.location || null,
      childrens: null,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  /**
   * 生成租户相关的ID
   * @param {string} tenantId - 租户ID
   * @param {number} baseId - 基础ID
   * @returns {number} - 租户相关的ID
   */
  generateTenantId(tenantId, baseId) {
    // 简单的租户ID生成策略，实际项目中可能需要更复杂的策略
    const tenantHash = this.hashCode(tenantId);
    return Math.abs(tenantHash * 1000000 + baseId % 1000000);
  }

  /**
   * 简单的字符串哈希函数
   * @param {string} str - 输入字符串
   * @returns {number} - 哈希值
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * 获取模拟OCR数据（用于开发和测试）
   * @param {number} imageCount - 图片数量
   * @param {string} tenantId - 租户ID
   * @returns {Array} - 模拟的家谱数据
   */
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
    
    console.log(`🧪 生成模拟OCR数据: ${mockData.length}条记录 (租户: ${tenantId})`);
    return mockData;
  }

  /**
   * 验证OCR配置是否完整
   * @returns {Object} - 验证结果
   */
  validateConfig() {
    const issues = [];
    
    if (!this.accessKeyId) {
      issues.push('缺少火山引擎Access Key ID');
    }
    
    if (!this.secretAccessKey) {
      issues.push('缺少火山引擎Secret Access Key');
    }
    
    if (!this.volcEndpoint) {
      issues.push('缺少火山引擎OCR端点配置');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      isDevMode: process.env.REACT_APP_ENV === 'development' && issues.length > 0,
    };
  }
}

// 创建单例实例
const ocrService = new OCRService();

export default ocrService;
