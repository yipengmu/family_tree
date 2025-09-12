/**
 * 通义千问OCR服务
 * 通过后端API调用阿里云通义千问进行家谱图片识别，解决CORS问题
 */

class QwenOCRService {
  constructor() {
    // 使用后端API端点，避免CORS问题
    this.backendEndpoint = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3003';
    this.ocrEndpoint = `${this.backendEndpoint}/api/qwen/ocr`;
    
    console.log('🔧 通义千问VL OCR服务初始化...');
    console.log('🏢 后端服务:', this.backendEndpoint);
    console.log('🔄 OCR端点:', this.ocrEndpoint);
    console.log('💡 架构: 前端 → 后端 → 千问API (解决CORS问题)');
    
    // 执行初始检查
    this.performInitialCheck();
  }

  /**
   * 执行初始检查
   */
  async performInitialCheck() {
    try {
      console.log('🔍 检查后端服务连接...');
      const response = await fetch(`${this.backendEndpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 后端服务连接正常:', result.message);
      } else {
        console.warn('⚠️ 后端服务响应异常:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ 后端服务连接失败:', error.message);
      console.warn('💡 请确保后端服务已启动: npm run server');
    }
  }

  /**
   * 测试解析指定图片（通过后端）
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<Array>} - 识别结果
   */
  async testParseImage(imageUrl = 'https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg') {
    console.log(`\n🧪 测试图片解析（通过后端）`);
    console.log(`🖼️ 测试图片: ${imageUrl}`);
    
    try {
      const result = await this.recognizeFamilyTree([imageUrl], 'test');
      console.log(`✅ 测试完成，识别到 ${result.length} 条记录`);
      return result;
    } catch (error) {
      console.error(`❌ 测试失败:`, error);
      throw error;
    }
  }

  async recognizeFamilyTree(imageUrls, tenantId = 'default') {
    const requestId = Date.now().toString(36);
    console.log(`\n🆔 [前端-${requestId}] ========== 开始家谱识别 ==========`);
    
    try {
      console.log(`🔍 [前端-${requestId}] 识别参数:`, {
        imageCount: imageUrls.length,
        tenantId: tenantId,
        backendEndpoint: this.backendEndpoint,
        requestTime: new Date().toISOString()
      });

      // 验证图片URLs
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        console.error(`❌ [前端-${requestId}] 无效的图片URL参数`);
        throw new Error('请提供有效的图片URL');
      }

      console.log(`📤 [前端-${requestId}] 发送请求到后端服务...`);
      const startTime = Date.now();

      // 调用后端API
      const response = await fetch(this.ocrEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrls: imageUrls,
          tenantId: tenantId
        }),
        timeout: 120000 // 120秒超时（比后端稍长）
      });

      const duration = Date.now() - startTime;
      console.log(`⏱️ [前端-${requestId}] 后端API响应时间: ${duration}ms`);
      console.log(`📊 [前端-${requestId}] 响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [前端-${requestId}] 后端API请求失败:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 500 && errorData.code === 'MISSING_API_KEY') {
          throw new Error('后端服务未配置千问API Key，请检查服务器环境变量');
        } else if (response.status === 400) {
          throw new Error(errorData.error || '请求参数错误');
        } else {
          throw new Error(`后端服务错误: ${response.status} ${response.statusText}`);
        }
      }

      const result = await response.json();
      console.log(`📥 [前端-${requestId}] 后端API响应:`, {
        success: result.success,
        count: result.count,
        processedImages: result.processedImages,
        backendRequestId: result.requestId
      });

      if (result.success && result.data) {
        console.log(`🎉 [前端-${requestId}] 识别完成，共获得 ${result.data.length} 条记录`);
        return result.data;
      } else {
        console.warn(`⚠️ [前端-${requestId}] 后端返回空结果`);
        return [];
      }

    } catch (error) {
      console.error(`❌ [前端-${requestId}] 识别失败:`, error);
      
      // 检查是否是后端连接错误
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error(`🌐 [前端-${requestId}] 无法连接到后端服务`);
        console.error(`💡 [前端-${requestId}] 解决方案:`);
        console.error(`   1. 确保后端服务已启动: npm run server`);
        console.error(`   2. 检查后端服务地址: ${this.backendEndpoint}`);
        console.error(`   3. 检查网络连接`);
        
        // 在开发环境提供模拟数据
        if (process.env.NODE_ENV === 'development') {
          console.warn(`🔄 [前端-${requestId}] 后端服务不可用，返回模拟数据`);
          return this.getMockFamilyData(imageUrls);
        }
        
        throw new Error('无法连接到后端服务，请确保后端服务已启动。');
      }
      
      throw error;
    }
  }

  /**
   * 获取模拟家谱数据（用于开发测试）
   */
  getMockFamilyData(imageUrls) {
    console.log('🎭 生成模拟家谱数据...');
    
    const mockData = [
      {
        id: 1,
        name: "张明德",
        g_rank: 1,
        rank_index: 1,
        g_father_id: 0,
        official_position: "清·庠生",
        summary: "家族始祖，清朝庠生，品行端正，教子有方",
        adoption: "none",
        sex: "MAN",
        g_mother_id: null,
        birth_date: "1820年",
        id_card: null,
        face_img: imageUrls[0] || "",
        photos: null,
        household_info: null,
        spouse: "李氏",
        home_page: null,
        dealth: "death",
        formal_name: "张明德",
        location: "江苏苏州",
        childrens: "张文华、张文贵、张文富"
      },
      {
        id: 2,
        name: "张文华",
        g_rank: 2,
        rank_index: 1,
        g_father_id: 1,
        official_position: "民国·教师",
        summary: "长子，民国时期教师，热心教育事业",
        adoption: "none",
        sex: "MAN",
        g_mother_id: null,
        birth_date: "1850年",
        id_card: null,
        face_img: imageUrls[0] || "",
        photos: null,
        household_info: null,
        spouse: "王氏",
        home_page: null,
        dealth: "death",
        formal_name: "张文华",
        location: "江苏苏州",
        childrens: "张志强、张志明"
      },
      {
        id: 3,
        name: "张文贵",
        g_rank: 2,
        rank_index: 2,
        g_father_id: 1,
        official_position: "商人",
        summary: "次子，经商有道，家业兴旺",
        adoption: "none",
        sex: "MAN",
        g_mother_id: null,
        birth_date: "1852年",
        id_card: null,
        face_img: imageUrls[0] || "",
        photos: null,
        household_info: null,
        spouse: "陈氏",
        home_page: null,
        dealth: "death",
        formal_name: "张文贵",
        location: "江苏苏州",
        childrens: "张志勇、张志刚"
      }
    ];
    
    console.log(`🎭 生成了 ${mockData.length} 条模拟数据`);
    return mockData;
  }
}

// 创建单例实例
const qwenOcrService = new QwenOCRService();

export default qwenOcrService;
