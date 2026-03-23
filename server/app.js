/**
 * Express后端服务器
 * 处理千问API调用，解决CORS问题
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
global.fetch = global.fetch || require('node-fetch');
require('dotenv').config();

// 导入数据库服务
const familyDataService = require('./services/familyDataService');
const tenantService = require('./services/tenantService');

// 导入用户认证相关模块
const User = require('./models/user');
const { sendVerificationCodeByEmail, registerUser, loginUser, generateToken } = require('./services/authService');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3003;

// 中间件配置 - 增加请求头大小限制
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003', // 添加本地开发服务器地址
    'https://www.tatababa.top',  // 线上域名
    'https://tatababa.top',      // 如果有非www版本
    'http://localhost:3001'    // 前端开发服务器
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ['Content-Length', 'X-Content-Type-Options', 'X-Kuma-Revision', 'X-Kuma-Tagline'],
  maxAge: 86400 // 24小时
}));

// 增加请求头和请求体大小限制
app.use(express.json({ limit: '50mb', maxHeaderSize: 1024 * 1024 * 20 })); // 20MB header limit, 50MB body limit
app.use(express.urlencoded({ extended: true, limit: '50mb', maxHeaderSize: 1024 * 1024 * 20 }));

// JWT中间件
const jwt = require('jsonwebtoken');
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_development';
  
  // 在生产环境中，如果JWT_SECRET未设置，记录警告
  if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'development') {
    console.warn('⚠️ 警告: JWT_SECRET 环境变量未设置，使用默认密钥。请在线上环境中设置JWT_SECRET环境变量。');
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }
    req.user = user;
    next();
  });
};

// 获取精简时间戳的工具函数
function getTimestamp() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

// 中间件：处理预检请求
// Express 5.x 使用 {*path} 语法替代 *
app.options('{*path}', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24小时
  res.sendStatus(200);
});

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${getTimestamp()}] ${req.method} ${req.path}`);
  next();
});

// 初始化用户表
User.initializeTable().then(() => {
  console.log('✅ 用户表初始化完成');
}).catch((error) => {
  console.error('❌ 用户表初始化失败:', error);
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '家谱创作工具后端服务运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==================== 认证API ====================

// 发送验证码
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email) {
      return res.status(400).json({ error: '邮箱地址是必需的' });
    }

    if (!purpose || !['register', 'reset'].includes(purpose)) {
      return res.status(400).json({ error: '验证码用途必须是 register 或 reset' });
    }

    const result = await sendVerificationCodeByEmail(email, purpose);

    res.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[${getTimestamp()}] 发送验证码失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message || '发送验证码失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, code } = req.body;

    if (!name || !email || !password || !code) {
      return res.status(400).json({ 
        success: false,
        error: '姓名、邮箱、密码和验证码都是必需的' 
      });
    }

    // 注册用户
    const user = await registerUser({ name, email, password, code });

    // 生成JWT令牌
    const token = generateToken(user.id);

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at
      },
      message: '注册成功'
    });

  } catch (error) {
    console.error(`[${getTimestamp()}] 用户注册失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message || '注册失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: '邮箱和密码都是必需的' 
      });
    }

    // 登录用户
    const user = await loginUser(email, password);

    // 生成JWT令牌
    const token = generateToken(user.id);

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      },
      message: '登录成功'
    });

  } catch (error) {
    console.error(`[${getTimestamp()}] 用户登录失败:`, error);
    res.status(401).json({
      success: false,
      error: error.message || '登录失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取当前用户信息
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[${getTimestamp()}] 获取用户信息失败:`, error);
    res.status(500).json({
      error: '获取用户信息失败',
      message: error.message
    });
  }
});

// ==================== 千问API代理端点 ====================

app.post('/api/qwen/ocr', async (req, res) => {
  const requestId = Date.now().toString(36);
  console.log(`\n[${getTimestamp()}] 🆔 [后端-${requestId}] ========== 新的OCR请求 ==========`);
  
  try {
    const { imageUrls, tenantId = 'default' } = req.body;
    
    console.log(`[${getTimestamp()}] 📥 [后端-${requestId}] 收到OCR请求:`, {
      imageCount: imageUrls?.length || 0,
      tenantId: tenantId,
      requestTime: new Date().toISOString()
    });

    // 验证请求参数
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 无效的图片URL参数`);
      return res.status(400).json({
        error: '请提供有效的图片URL数组',
        code: 'INVALID_IMAGES'
      });
    }

    // 验证API Key
    const apiKey = process.env.REACT_APP_QWEN_API_KEY;
    if (!apiKey) {
      console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 未配置千问API Key`);
      return res.status(500).json({
        error: '服务器未配置千问API Key',
        code: 'MISSING_API_KEY'
      });
    }

    console.log(`[${getTimestamp()}] 🔑 [后端-${requestId}] API Key状态: 已配置 (${apiKey.substring(0, 8)}...)`);

    const results = [];

    // 逐个处理图片
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`[${getTimestamp()}] 🖼️ [后端-${requestId}] 处理图片 ${i + 1}/${imageUrls.length}: ${imageUrl}`);

      try {
        const result = await processImageWithQwen(imageUrl, apiKey, requestId);
        if (result && result.length > 0) {
          results.push(...result);
          console.log(`[${getTimestamp()}] ✅ [后端-${requestId}] 图片 ${i + 1} 识别成功，获得 ${result.length} 条记录`);
        } else {
          console.warn(`[${getTimestamp()}] ⚠️ [后端-${requestId}] 图片 ${i + 1} 未识别到有效数据`);
        }
      } catch (error) {
        console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 图片 ${i + 1} 识别失败:`, error.message);
        // 继续处理下一张图片，不中断整个流程
      }
    }

    console.log(`[${getTimestamp()}] 🎉 [后端-${requestId}] OCR处理完成，共获得 ${results.length} 条记录`);

    // 返回结果
    res.json({
      success: true,
      data: results,
      count: results.length,
      requestId: requestId,
      processedImages: imageUrls.length
    });

  } catch (error) {
    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] OCR请求处理失败:`, error);

    res.status(500).json({
      error: '服务器内部错误',
      message: error.message,
      code: 'INTERNAL_ERROR',
      requestId: requestId
    });
  }
});

/**
 * 使用千问API处理单张图片（带重试机制）
 */
async function processImageWithQwen(imageUrl, apiKey, requestId) {
  const maxRetries = 2; // 最多重试2次
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${getTimestamp()}] 🔄 [后端-${requestId}] 第 ${attempt}/${maxRetries} 次尝试`);
      return await processImageWithQwenSingle(imageUrl, apiKey, requestId, attempt);
    } catch (error) {
      lastError = error;
      console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 第 ${attempt} 次尝试失败:`, error.message);

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // 递增延迟：2秒、4秒
        console.log(`[${getTimestamp()}] ⏳ [后端-${requestId}] 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 单次千问API调用
 */
async function processImageWithQwenSingle(imageUrl, apiKey, requestId, attempt = 1) {
  const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  const model = 'qwen-vl-max-2025-08-13';

  const prompt = `分析家谱图片，识别人物信息。按JSON数组格式返回，只返回JSON，不要其他文字：
[{"id":1,"name":"姓名","g_rank":1,"rank_index":1,"g_father_id":0,"sex":"MAN","adoption":"none","official_position":"","summary":""}]

规则：
- id从1开始递增
- g_rank是世代数（第一代为1）
- rank_index是同代排序（从1开始）
- g_father_id是父亲的id（第一代为0）
- sex固定为"MAN"
- adoption固定为"none"
- 常见家谱图片是上下排版，根据图片中的内容，及家谱的纵向连线关系，建立父子代际关系（如果上方没有连接线，则代表是初代）
- 横向的每一行代表一个世代，每个世代有统一的世代序号
- 家谱图片中的人员节点格式要尽可能的识别完整，不要有遗漏（如果识别不清，不可特殊标记，但不要跳过）
- official_position和summary可为空字符串
- 只返回纯JSON数组，不要其他文字`;

  const requestBody = {
    model: model,
    input: {
      messages: [
        {
          role: "user",
          content: [
            {
              text: prompt
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

  console.log(`[${getTimestamp()}] 📤 [后端-${requestId}] 调用千问API (尝试 ${attempt})...`);

  // 移除网络连接预测试，直接调用API
  // 网络连接测试可能会干扰实际的API调用，特别是当根域名返回404时
  console.log(`[${getTimestamp()}] 🔍 [后端-${requestId}] 跳过网络预测试，直接调用千问API...`);

  const startTime = Date.now();

  // 创建超时控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[${getTimestamp()}] ⏰ [后端-${requestId}] 千问API请求超时，正在取消请求...`);
    controller.abort();
  }, 100000); // 增加到100秒超时

  console.log(`[${getTimestamp()}] 📡 [后端-${requestId}] 发送请求到千问API，超时设置: 100秒`);

  // 打印完整的请求结构体
  console.log(`[${getTimestamp()}] 📤 [后端-${requestId}] 请求结构体:`, JSON.stringify(requestBody, null, 2));

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    // 清除超时定时器
    clearTimeout(timeoutId);
  } catch (fetchError) {
    // 清除超时定时器
    clearTimeout(timeoutId);

    // 打印完整的网络错误结构体
    const networkErrorStructure = {
      name: fetchError.name,
      message: fetchError.message,
      code: fetchError.code,
      type: fetchError.type,
      errno: fetchError.errno,
      syscall: fetchError.syscall,
      hostname: fetchError.hostname,
      stack: fetchError.stack,
      timestamp: new Date().toISOString(),
      requestUrl: endpoint,
      requestMethod: 'POST'
    };
    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 网络错误结构体:`, JSON.stringify(networkErrorStructure, null, 2));

    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 网络请求失败摘要:`, {
      errorType: fetchError.name,
      errorCode: fetchError.code,
      message: fetchError.message
    });

    // 根据错误类型提供具体的错误信息
    if (fetchError.name === 'AbortError') {
      throw new Error(`千问API请求超时 (100秒)，请检查网络连接或稍后重试`);
    } else if (fetchError.code === 'ENOTFOUND') {
      throw new Error('无法解析千问API域名，请检查网络连接或DNS设置');
    } else if (fetchError.code === 'ECONNREFUSED') {
      throw new Error('无法连接到千问API服务器，请检查网络连接');
    } else if (fetchError.code === 'ECONNRESET') {
      throw new Error('与千问API服务器的连接被重置，请稍后重试');
    } else if (fetchError.message.includes('timeout')) {
      throw new Error('千问API请求超时，请检查网络连接或稍后重试');
    } else {
      throw new Error(`网络请求失败: ${fetchError.message}`);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[${getTimestamp()}] ⏱️ [后端-${requestId}] 千问API响应时间: ${duration}ms`);
  console.log(`[${getTimestamp()}] 📊 [后端-${requestId}] 响应状态: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();

    // 打印完整的错误结构体
    const errorStructure = {
      status: response.status,
      statusText: response.statusText,
      url: endpoint,
      headers: response.headers.raw(),
      errorBody: errorText
    };
    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 错误结构体:`, JSON.stringify(errorStructure, null, 2));

    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 千问API请求失败摘要:`, {
      status: response.status,
      statusText: response.statusText,
      errorLength: errorText.length
    });

    // 根据状态码提供具体的错误信息
    let errorMessage = `千问API请求失败: ${response.status} ${response.statusText}`;
    if (response.status === 401) {
      errorMessage = 'API Key无效或已过期，请检查REACT_APP_QWEN_API_KEY配置';
    } else if (response.status === 403) {
      errorMessage = 'API访问被拒绝，请检查API Key权限或模型访问权限';
    } else if (response.status === 429) {
      errorMessage = 'API调用频率超限，请稍后重试';
    } else if (response.status === 400) {
      errorMessage = `请求参数错误: ${errorText}`;
    } else if (response.status >= 500) {
      errorMessage = `千问服务器内部错误: ${response.status} ${response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();

  // 打印完整的返回结构体
  console.log(`[${getTimestamp()}] 📥 [后端-${requestId}] 返回结构体:`, JSON.stringify(result, null, 2));

  console.log(`[${getTimestamp()}] 📊 [后端-${requestId}] 千问API响应摘要:`, {
      hasOutput: !!result.output,
      hasChoices: !!result.output?.choices,
      choicesLength: result.output?.choices?.length || 0,
      usage: result.usage
    });

  if (result.output && result.output.choices && result.output.choices.length > 0) {
    const choice = result.output.choices[0];
    let content = '';

    // 处理新的响应格式：content可能是数组，包含text字段
    if (choice.message && choice.message.content) {
      if (Array.isArray(choice.message.content)) {
        // 新格式：content是数组，查找text字段
        const textContent = choice.message.content.find(item => item.text);
        if (textContent && textContent.text) {
          content = textContent.text;
          console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 使用新格式解析，从content数组中提取text字段`);
        } else {
          console.warn(`[${getTimestamp()}] ⚠️ [后端-${requestId}] 新格式中未找到text字段`);
          return [];
        }
      } else {
        // 旧格式：content直接是字符串
        content = choice.message.content;
        console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 使用旧格式解析，content直接是字符串`);
      }
    } else {
      console.warn(`[${getTimestamp()}] ⚠️ [后端-${requestId}] 响应格式异常，未找到message.content`);
      return [];
    }

    console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 识别内容长度: ${content.length} 字符`);
    console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 识别内容预览: ${content.substring(0, 200)}...`);

    return parseQwenResponse(content, requestId);
  } else {
    console.warn(`[${getTimestamp()}] ⚠️ [后端-${requestId}] 千问API返回空结果`);
    return [];
  }
}

/**
 * 解析千问API响应
 */
function parseQwenResponse(content, requestId) {
  try {
    console.log(`[${getTimestamp()}] 🔍 [后端-${requestId}] 开始解析响应内容...`);
    console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 原始内容长度: ${content.length} 字符`);
    console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 原始内容预览: ${content.substring(0, 500)}...`);

    let jsonStr = content.trim();

    // 移除可能的markdown格式
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7); // 移除 ```json
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3); // 移除结尾的 ```
      }
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.substring(3); // 移除开头的 ```
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3); // 移除结尾的 ```
      }
    }

    // 尝试解析JSON
    let parsedData = JSON.parse(jsonStr);
    
    // 确保返回的是数组
    if (!Array.isArray(parsedData)) {
      console.warn(`[${getTimestamp()}] ⚠️ [后端-${requestId}] 解析结果不是数组，尝试包装成数组`);
      parsedData = [parsedData];
    }

    // 验证数据结构
    const validatedData = parsedData.map((item, index) => {
      // 确保必需字段存在
      const validatedItem = {
        id: item.id || index + 1,
        name: item.name || `未知姓名${index + 1}`,
        g_rank: item.g_rank || 1,
        rank_index: item.rank_index || index + 1,
        g_father_id: typeof item.g_father_id !== 'undefined' ? item.g_father_id : 0,
        sex: item.sex || "MAN",
        adoption: item.adoption || "none",
        official_position: item.official_position || "",
        summary: item.summary || ""
      };
      
      return validatedItem;
    });

    console.log(`[${getTimestamp()}] ✅ [后端-${requestId}] 成功解析 ${validatedData.length} 条记录`);
    return validatedData;

  } catch (parseError) {
    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] JSON解析失败:`, parseError.message);
    
    // 尝试更宽松的解析方法
    try {
      // 查找JSON部分
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        let jsonData = jsonMatch[0];
        
        // 尝试修复常见的JSON问题
        jsonData = jsonData.replace(/,\s*[}\]]/g, ']');
        jsonData = jsonData.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // 添加引号到键名
        
        const parsed = JSON.parse(jsonData);
        console.log(`[${getTimestamp()}] ✅ [后端-${requestId}] 使用宽松解析成功`);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (looseParseError) {
      console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 宽松解析也失败:`, looseParseError.message);
    }
    
    // 返回默认空数组
    console.warn(`[${getTimestamp()}] ⚠️ [后端-${requestId}] 返回空数组作为备选`);
    return [];
  }
}

// 在服务器启动时添加错误处理
app.on('error', (error) => {
  console.error('服务器错误:', error);
});

// 创建HTTP服务器
// 注意：Node.js 18+ 默认 HTTP 头部大小限制为 16KB
// 如果需要更大的头部限制，需要通过命令行参数 --max-http-header-size 启动
// 例如：node --max-http-header-size=10485760 server/app.js
const server = http.createServer(app);

// 设置服务器超时
server.headersTimeout = 60000; // 60秒头部超时
server.requestTimeout = 120000; // 120秒请求超时

// 监听端口
server.listen(PORT, () => {
  console.log(`🚀 家谱创作工具后端服务器运行在端口 ${PORT}`);
  console.log(`📋 可用端点:`);
  console.log(`   GET  /health - 健康检查`);
  console.log(`   POST /api/auth/login - 用户登录`);
  console.log(`   POST /api/auth/register - 用户注册`);
  console.log(`   POST /api/auth/send-code - 发送验证码`);
  console.log(`   GET  /api/user/profile - 获取用户资料 (需认证)`);
  console.log(`   POST /api/qwen/ocr - OCR处理接口`);
  console.log(`\n监听地址: http://localhost:${PORT}`);
});

// 监听服务器错误
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用，请更改端口或关闭占用该端口的程序`);
  } else {
    console.error('服务器启动错误:', error);
  }
});

module.exports = app;