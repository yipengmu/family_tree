/**
 * 仅启动代理服务器的脚本
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 通义千问配置
const QWEN_CONFIG = {
  apiKey: process.env.REACT_APP_QWEN_API_KEY,
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  model: 'qwen-vl-max'
};

console.log('🚀 启动代理服务器...');
console.log('🔑 API Key:', QWEN_CONFIG.apiKey ? `已配置 (${QWEN_CONFIG.apiKey.substring(0, 8)}...)` : '❌ 未配置');

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '通义千问代理服务',
    hasApiKey: !!QWEN_CONFIG.apiKey,
    timestamp: new Date().toISOString()
  });
});

// OCR代理接口
app.post('/api/qwen/ocr', async (req, res) => {
  try {
    console.log('📥 收到OCR请求');
    
    if (!QWEN_CONFIG.apiKey) {
      return res.status(500).json({
        success: false,
        error: '未配置API Key'
      });
    }

    const { imageUrls, tenantId } = req.body;
    console.log('📸 图片URLs:', imageUrls);

    // 简单的测试响应
    const mockResult = [
      {
        name: "测试人物",
        generation: 1,
        order: 1,
        father_name: null,
        position: "测试职位",
        description: "这是通过代理服务器返回的测试数据",
        gender: "男",
        birth_date: null,
        death_date: null,
        spouse: null,
        location: null,
        children: null
      }
    ];

    console.log('✅ 返回测试数据');
    
    res.json({
      success: true,
      data: mockResult,
      message: '代理服务器工作正常'
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
app.listen(PORT, () => {
  console.log(`✅ 代理服务器已启动: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📡 OCR接口: http://localhost:${PORT}/api/qwen/ocr`);
  console.log('');
  console.log('现在可以在前端测试OCR功能了！');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 关闭代理服务器...');
  process.exit(0);
});
