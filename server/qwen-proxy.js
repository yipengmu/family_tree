/**
 * 通义千问API代理服务器
 * 解决CORS跨域问题，代理前端请求到通义千问API
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
const PORT = process.env.PROXY_PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 通义千问配置
const QWEN_CONFIG = {
  apiKey: process.env.REACT_APP_QWEN_API_KEY,
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  model: 'qwen-vl-max'
};

console.log('🚀 通义千问代理服务器启动中...');
console.log('🔑 API Key状态:', QWEN_CONFIG.apiKey ? `已配置 (${QWEN_CONFIG.apiKey.substring(0, 8)}...)` : '未配置');
console.log('🌐 代理端口:', PORT);

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '通义千问代理服务',
    timestamp: new Date().toISOString(),
    config: {
      hasApiKey: !!QWEN_CONFIG.apiKey,
      endpoint: QWEN_CONFIG.endpoint,
      model: QWEN_CONFIG.model
    }
  });
});

// 通义千问OCR代理接口
app.post('/api/qwen/ocr', async (req, res) => {
  try {
    console.log('📥 收到OCR请求:', {
      imageCount: req.body.imageUrls?.length || 0,
      tenantId: req.body.tenantId
    });

    // 验证API Key
    if (!QWEN_CONFIG.apiKey) {
      return res.status(500).json({
        success: false,
        error: '服务器未配置通义千问API Key'
      });
    }

    // 验证请求参数
    const { imageUrls, tenantId, prompt } = req.body;
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少图片URL参数'
      });
    }

    console.log('📸 处理图片URLs:', imageUrls);

    const results = [];

    // 逐个处理图片
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`🔍 处理第 ${i + 1}/${imageUrls.length} 张图片: ${imageUrl}`);

      try {
        const result = await processImageWithQwen(imageUrl, prompt);
        if (result && result.length > 0) {
          results.push(...result);
        }
      } catch (error) {
        console.error(`❌ 处理图片 ${i + 1} 失败:`, error.message);
        // 继续处理下一张图片，不中断整个流程
      }
    }

    console.log(`✅ OCR处理完成，共识别 ${results.length} 条记录`);

    res.json({
      success: true,
      data: results,
      stats: {
        totalImages: imageUrls.length,
        totalRecords: results.length,
        tenantId: tenantId
      }
    });

  } catch (error) {
    console.error('❌ OCR代理服务错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 处理单张图片的函数
async function processImageWithQwen(imageUrl, customPrompt) {
  const familyTreePrompt = customPrompt || `
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

  const requestBody = {
    model: QWEN_CONFIG.model,
    input: {
      messages: [
        {
          role: "user",
          content: [
            {
              text: familyTreePrompt
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
      temperature: 0.1,
      top_p: 0.8
    }
  };

  console.log('📤 发送通义千问API请求...');
  const startTime = Date.now();

  const response = await fetch(QWEN_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QWEN_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-SSE': 'disable'
    },
    body: JSON.stringify(requestBody)
  });

  const duration = Date.now() - startTime;
  console.log(`📡 API响应时间: ${duration}ms`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ 通义千问API错误:', errorText);
    throw new Error(`通义千问API请求失败: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('📄 通义千问API响应:', result);

  if (result.output && result.output.choices && result.output.choices.length > 0) {
    const content = result.output.choices[0].message.content;
    console.log('📝 识别内容:', content);
    
    return parseQwenResponse(content);
  } else {
    console.warn('⚠️ 通义千问API返回空结果');
    return [];
  }
}

// 解析通义千问响应
function parseQwenResponse(content) {
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

    // 尝试简单的文本解析作为备用
    try {
      const lines = content.split('\n').filter(line => line.trim());
      console.log('🔄 尝试文本解析作为备用方案');
      return [];
    } catch (backupError) {
      console.error('❌ 备用解析也失败:', backupError);
      return [];
    }
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 通义千问代理服务器已启动`);
  console.log(`🌐 服务地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📡 OCR接口: http://localhost:${PORT}/api/qwen/ocr`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭代理服务器...');
  process.exit(0);
});

module.exports = app;
