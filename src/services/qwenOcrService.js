/**
 * 通义千问VL-Max OCR服务
 * 集成阿里云通义千问VL-Max模型进行家谱图片识别
 */

class QwenOCRService {
  constructor() {
    this.apiKey = process.env.REACT_APP_QWEN_API_KEY;
    this.model = process.env.REACT_APP_QWEN_MODEL || 'qwen-vl-max';
    this.endpoint = process.env.REACT_APP_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

    // 使用代理服务器避免CORS问题
    this.proxyEndpoint = process.env.REACT_APP_PROXY_ENDPOINT || 'http://localhost:3001/api/qwen/ocr';
    this.useProxy = true; // 默认使用代理
    
    // 家谱识别提示词模板 - 优化为返回标准JSON格式
    this.familyTreePrompt = `
请仔细分析这张家谱图片，提取其中的人物信息。请严格按照以下JSON数组格式返回数据，不要添加任何其他文字说明：

[
  {
    "id": 数字ID(从1开始递增),
    "name": "人物姓名",
    "g_rank": 世代数字(1表示第一代),
    "rank_index": 在同代中的排序(1,2,3...),
    "g_father_id": 父亲的ID(如果是第一代则为0),
    "official_position": "官职或职位(如'明·禀膳生赠宁津主簿')",
    "summary": "人物描述或生平简介",
    "adoption": "none",
    "sex": "性别('MAN'或'WOMAN')",
    "g_mother_id": null,
    "birth_date": "出生日期(如果有)",
    "id_card": null,
    "face_img": null,
    "photos": null,
    "household_info": null,
    "spouse": "配偶姓名(如果有)",
    "home_page": null,
    "dealth": "如果已故则为'dealth'，否则为null",
    "formal_name": "正式姓名(如果有)",
    "location": "籍贯或居住地(如果有)",
    "childrens": "子女姓名列表，用逗号分隔(如果有)"
  }
]

重要要求：
1. 必须返回有效的JSON数组格式，不要包含任何markdown标记或其他文字
2. 仔细识别每个人物的姓名，注意繁体字转换为简体字
3. 根据家谱的布局判断世代关系(g_rank)和同代排序(rank_index)
4. 通过人物姓名建立父子关系(g_father_id对应父亲的id)
5. 提取官职、学位等信息到official_position字段
6. 性别用'MAN'或'WOMAN'表示
7. 如果信息不清楚或没有，请设为null
8. 确保每个人物都有唯一的数字ID

请开始分析并直接返回JSON数组：
`;
  }

  /**
   * 调用通义千问VL-Max识别家谱图片
   * @param {Array<string>} imageUrls - 图片URL数组
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 解析后的家谱数据
   */
  async recognizeFamilyTree(imageUrls, tenantId = 'default') {
    try {
      console.log('🔍 开始通义千问VL-Max OCR识别，图片数量:', imageUrls.length);
      console.log('📋 图片URLs:', imageUrls);
      console.log('🏢 租户ID:', tenantId);
      console.log('🔑 API Key状态:', this.apiKey ? `已配置 (${this.apiKey.substring(0, 8)}...)` : '未配置');
      console.log('🌐 使用代理服务器:', this.proxyEndpoint);

      if (!this.apiKey) {
        console.error('❌ 未配置通义千问API Key，无法进行真实识别');
        console.log('💡 请在.env文件中设置 REACT_APP_QWEN_API_KEY');
        throw new Error('通义千问API Key未配置，无法进行OCR识别');
      }

      console.log('✅ 配置验证通过，通过代理服务器调用API...');

      // 通过代理服务器调用
      const response = await this.callProxyAPI(imageUrls, tenantId);

      if (response.success && response.data) {
        console.log(`✅ 通义千问OCR识别完成，共解析到 ${response.data.length} 条记录`);
        return this.processOCRResult(response.data, tenantId);
      } else {
        throw new Error(response.error || '代理服务器返回错误');
      }

    } catch (error) {
      console.error('❌ 通义千问OCR识别失败:', error);
      console.error('❌ 错误详情:', error.stack);

      // 不再回退到mock数据，抛出真实错误
      throw new Error(`通义千问OCR识别失败: ${error.message}`);
    }
  }

  /**
   * 通过代理服务器调用通义千问API
   * @param {Array<string>} imageUrls - 图片URL数组
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Object>} - API响应
   */
  async callProxyAPI(imageUrls, tenantId) {
    console.log('📤 通过代理服务器发送请求...');

    const requestBody = {
      imageUrls,
      tenantId,
      prompt: this.familyTreePrompt
    };

    console.log('📋 请求参数:', requestBody);

    const startTime = Date.now();
    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const duration = Date.now() - startTime;
    console.log(`📡 代理服务器响应时间: ${duration}ms`);
    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 代理服务器请求失败:', errorText);
      throw new Error(`代理服务器请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📄 代理服务器响应:', result);
    return result;
  }

  /**
   * 处理单张图片 (已弃用，现在使用代理服务器)
   * @param {string} imageUrl - 图片URL
   * @param {string} tenantId - 租户ID
   * @returns {Promise<Array>} - 识别结果
   */
  async processImage(imageUrl, tenantId) {
    const requestBody = {
      model: this.model,
      input: {
        messages: [
          {
            role: "user",
            content: [
              {
                text: this.familyTreePrompt
              },
              {
                image: imageUrl
              }
            ]
          }
        ]
      },
      parameters: {
        result_format: "message",
        max_tokens: 2000,
        temperature: 0.1, // 降低随机性，提高准确性
        top_p: 0.8
      }
    };

    console.log('📤 发送通义千问API请求...');
    console.log('🖼️ 图片URL:', imageUrl);
    console.log('📋 请求体:', JSON.stringify(requestBody, null, 2));

    const startTime = Date.now();
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody)
    });

    const duration = Date.now() - startTime;
    console.log(`📡 API响应时间: ${duration}ms`);
    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API请求失败详情:', errorText);
      throw new Error(`通义千问API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📄 通义千问API响应:', result);

    if (result.output && result.output.choices && result.output.choices.length > 0) {
      const content = result.output.choices[0].message.content;
      console.log('📝 识别内容:', content);
      
      return this.parseQwenResponse(content, tenantId);
    } else {
      console.warn('⚠️ 通义千问API返回空结果');
      return [];
    }
  }

  /**
   * 解析通义千问的响应内容
   * @param {string} content - API响应内容
   * @param {string} tenantId - 租户ID
   * @returns {Array} - 解析后的数据
   */
  parseQwenResponse(content, tenantId) {
    try {
      console.log('📄 原始响应内容:', content);

      // 尝试提取JSON数组内容
      let jsonMatch = content.match(/\[[\s\S]*\]/);

      // 如果没找到数组格式，尝试查找对象格式（兼容旧格式）
      if (!jsonMatch) {
        jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsedData = JSON.parse(jsonStr);

          // 如果是旧格式，转换为新格式
          if (parsedData.family_members && Array.isArray(parsedData.family_members)) {
            console.log(`✅ 解析旧格式数据，转换为新格式: ${parsedData.family_members.length} 个成员`);
            return parsedData.family_members;
          }
        }

        console.warn('⚠️ 未找到JSON格式的响应内容');
        return [];
      }

      const jsonStr = jsonMatch[0];
      const parsedData = JSON.parse(jsonStr);

      if (Array.isArray(parsedData)) {
        console.log(`✅ 成功解析JSON数组格式: ${parsedData.length} 个家族成员`);
        return parsedData;
      } else {
        console.warn('⚠️ 响应不是数组格式');
        return [];
      }
    } catch (error) {
      console.error('❌ 解析通义千问响应失败:', error);
      console.log('📄 原始内容:', content);
      return [];
    }
  }

  /**
   * 处理OCR识别结果，转换为标准家谱数据格式
   * @param {Array} rawData - OCR原始数据
   * @param {string} tenantId - 租户ID
   * @returns {Array} - 标准化的家谱数据
   */
  processOCRResult(rawData, tenantId) {
    console.log('🔄 开始处理OCR结果，原始数据:', rawData);

    return rawData.map((item, index) => {
      // 检查数据是否已经是标准格式
      const isStandardFormat = item.hasOwnProperty('g_rank') && item.hasOwnProperty('rank_index');

      let processedItem;

      if (isStandardFormat) {
        // 如果已经是标准格式，只需要补充缺失字段
        processedItem = {
          id: item.id || this.generateTenantId(tenantId, Date.now() + index),
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
          childrens: item.childrens || null,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        // 如果是旧格式，进行转换
        processedItem = {
          id: this.generateTenantId(tenantId, Date.now() + index),
          name: item.name || `未知姓名${index + 1}`,
          g_rank: item.generation || 1,
          rank_index: item.order || (index + 1),
          g_father_id: this.findFatherId(item.father_name, rawData, tenantId) || 0,
          official_position: item.position || '',
          summary: item.description || null,
          adoption: 'none',
          sex: item.gender === '女' ? 'WOMAN' : 'MAN',
          g_mother_id: null,
          birth_date: item.birth_date || null,
          id_card: null,
          face_img: null,
          photos: null,
          household_info: null,
          spouse: item.spouse || null,
          home_page: null,
          dealth: item.death_date ? 'dealth' : null,
          formal_name: item.name || null,
          location: item.location || null,
          childrens: Array.isArray(item.children) ? item.children.join(', ') : item.children || null,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      console.log(`📝 处理第 ${index + 1} 条记录 (${isStandardFormat ? '标准格式' : '旧格式转换'}):`, processedItem);
      return processedItem;
    });
  }

  /**
   * 根据父亲姓名查找父亲ID
   * @param {string} fatherName - 父亲姓名
   * @param {Array} allData - 所有数据
   * @param {string} tenantId - 租户ID
   * @returns {number} - 父亲ID
   */
  findFatherId(fatherName, allData, tenantId) {
    if (!fatherName) return 0;
    
    const father = allData.find(person => person.name === fatherName);
    if (father) {
      return this.generateTenantId(tenantId, fatherName);
    }
    return 0;
  }

  /**
   * 生成租户相关的ID
   * @param {string} tenantId - 租户ID
   * @param {string|number} seed - 种子值
   * @returns {number} - 生成的ID
   */
  generateTenantId(tenantId, seed) {
    const combined = `${tenantId}_${seed}`;
    return Math.abs(this.hashCode(combined));
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
   * 验证通义千问配置是否完整
   * @returns {Object} - 验证结果
   */
  validateConfig() {
    const issues = [];
    
    if (!this.apiKey) {
      issues.push('缺少通义千问API Key');
    }
    
    if (!this.endpoint) {
      issues.push('缺少通义千问API端点配置');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      isDevMode: process.env.REACT_APP_ENV === 'development' && issues.length > 0,
    };
  }
}

// 创建单例实例
const qwenOcrService = new QwenOCRService();

export default qwenOcrService;
