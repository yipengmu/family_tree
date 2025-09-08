/**
 * 测试代理服务器启动脚本
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 导入fetch，兼容不同Node.js版本
let fetch;
try {
  // Node.js 18+ 内置fetch
  fetch = globalThis.fetch;
} catch (e) {
  // 使用node-fetch作为polyfill
  fetch = require('node-fetch');
}

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 通义千问配置
const QWEN_CONFIG = {
  apiKey: process.env.REACT_APP_QWEN_API_KEY,
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  model: 'qwen-vl-max'
};

console.log('🚀 测试代理服务器启动...');
console.log('🔑 API Key状态:', QWEN_CONFIG.apiKey ? `已配置 (${QWEN_CONFIG.apiKey.substring(0, 8)}...)` : '❌ 未配置');

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '通义千问代理服务',
    hasApiKey: !!QWEN_CONFIG.apiKey,
    timestamp: new Date().toISOString(),
    config: {
      endpoint: QWEN_CONFIG.endpoint,
      model: QWEN_CONFIG.model
    }
  });
});

// 简单的OCR测试接口
app.post('/api/qwen/ocr', async (req, res) => {
  try {
    console.log('📥 收到OCR请求');
    console.log('📋 请求体:', req.body);
    
    if (!QWEN_CONFIG.apiKey) {
      return res.status(500).json({
        success: false,
        error: '未配置通义千问API Key'
      });
    }

    const { imageUrls, tenantId } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({
        success: false,
        error: '缺少imageUrls参数或格式不正确'
      });
    }

    console.log('📸 图片URLs:', imageUrls);
    console.log('🏢 租户ID:', tenantId);

    // 返回测试数据，验证代理服务器工作正常
    const testData = [
      {
        "id": 1,
        "name": "测试人物1",
        "g_rank": 1,
        "rank_index": 1,
        "g_father_id": 0,
        "official_position": "测试职位",
        "summary": "这是通过代理服务器返回的测试数据，说明代理服务器工作正常",
        "adoption": "none",
        "sex": "MAN",
        "g_mother_id": null,
        "birth_date": null,
        "id_card": null,
        "face_img": null,
        "photos": null,
        "household_info": null,
        "spouse": null,
        "home_page": null,
        "dealth": null,
        "formal_name": null,
        "location": null,
        "childrens": null
      },
      {
        "id": 2,
        "name": "测试人物2",
        "g_rank": 2,
        "rank_index": 1,
        "g_father_id": 1,
        "official_position": "子辈职位",
        "summary": "第二代测试数据",
        "adoption": "none",
        "sex": "WOMAN",
        "g_mother_id": null,
        "birth_date": null,
        "id_card": null,
        "face_img": null,
        "photos": null,
        "household_info": null,
        "spouse": "配偶姓名",
        "home_page": null,
        "dealth": null,
        "formal_name": null,
        "location": null,
        "childrens": null
      }
    ];

    console.log('✅ 返回测试数据，数量:', testData.length);
    
    res.json({
      success: true,
      data: testData,
      message: '代理服务器工作正常，返回测试数据',
      stats: {
        totalImages: imageUrls.length,
        totalRecords: testData.length,
        tenantId: tenantId
      }
    });

  } catch (error) {
    console.error('❌ 代理服务器错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`✅ 测试代理服务器已启动: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📡 OCR接口: http://localhost:${PORT}/api/qwen/ocr`);
  console.log('');
  console.log('🎯 现在可以在前端测试OCR功能了！');
  console.log('📝 这个版本返回测试数据，验证代理服务器连接正常');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 关闭测试代理服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
});
