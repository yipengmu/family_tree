/**
 * Express后端服务器
 * 处理千问API调用，解决CORS问题
 */

const express = require('express');
const cors = require('cors');
global.fetch = global.fetch || require('node-fetch');
require('dotenv').config();

// 导入数据库服务
const familyDataService = require('./services/familyDataService');
const tenantService = require('./services/tenantService');

// 导入用户认证相关模块
const User = require('./models/user');
const { sendVerificationCodeByEmail, registerUser, loginUser, generateToken } = require('./services/authService');

const app = express();
const PORT = process.env.PORT || 3003;

// 中间件配置
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002',
    'https://www.tatababa.top',  // 线上域名
    'https://tatababa.top'      // 如果有非www版本
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
- 只返回纯JSON数组，不要markdown标记`;

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

    // 移除可能的markdown标记
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].trim();
    }

    // 查找JSON数组
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
      console.log(`[${getTimestamp()}] 🔍 [后端-${requestId}] 提取到JSON数组，长度: ${jsonStr.length} 字符`);
    } else {
      console.log(`[${getTimestamp()}] ⚠️ [后端-${requestId}] 未找到JSON数组格式，尝试解析整个内容`);
    }

    console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 准备解析的JSON: ${jsonStr.substring(0, 200)}...`);

    // 尝试修复常见的JSON格式问题
    jsonStr = fixJsonFormat(jsonStr, requestId);

    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed)) {
      console.log(`[${getTimestamp()}] ✅ [后端-${requestId}] JSON解析成功，识别到 ${parsed.length} 个人物`);
      if (parsed.length > 0) {
        console.log(`[${getTimestamp()}] 👤 [后端-${requestId}] 第一个人物示例: ${JSON.stringify(parsed[0], null, 2)}`);
      }
      return parsed;
    } else {
      console.log(`[${getTimestamp()}] ✅ [后端-${requestId}] JSON解析成功，识别到 1 个人物`);
      console.log(`[${getTimestamp()}] 👤 [后端-${requestId}] 人物信息: ${JSON.stringify(parsed, null, 2)}`);
      return [parsed];
    }

  } catch (parseError) {
    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] JSON解析失败:`, parseError.message);
    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 错误位置信息:`, {
      message: parseError.message,
      position: parseError.message.match(/position (\d+)/)?.[1] || 'unknown'
    });

    // 打印错误位置附近的内容
    const position = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
    if (position > 0) {
      const start = Math.max(0, position - 100);
      const end = Math.min(jsonStr.length, position + 100);
      console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 错误位置附近内容:`, jsonStr.substring(start, end));
    }

    console.error(`[${getTimestamp()}] ❌ [后端-${requestId}] 完整JSON内容:`, jsonStr);

    // 如果JSON解析失败，尝试从文本中提取基本信息
    return extractBasicInfo(content, requestId);
  }
}

/**
 * 修复常见的JSON格式问题
 */
function fixJsonFormat(jsonStr, requestId) {
  console.log(`[${getTimestamp()}] 🔧 [后端-${requestId}] 开始修复JSON格式...`);

  let fixed = jsonStr;

  // 1. 首先移除所有换行符和制表符（这是主要问题）
  fixed = fixed.replace(/[\n\r\t]/g, '');

  // 2. 移除多余的空白字符
  fixed = fixed.replace(/\s+/g, ' ');

  // 3. 修复单引号为双引号
  fixed = fixed.replace(/'/g, '"');

  // 4. 修复属性名没有引号的问题
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // 5. 修复尾随逗号
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // 6. 修复多余的逗号
  fixed = fixed.replace(/,,+/g, ',');

  // 7. 修复布尔值和null值的引号问题
  fixed = fixed.replace(/:\s*"(true|false|null)"/g, ': $1');

  // 8. 修复数字值的引号问题
  fixed = fixed.replace(/:\s*"(\d+)"/g, ': $1');

  // 9. 确保JSON结构完整
  fixed = fixed.trim();
  if (!fixed.startsWith('[') && !fixed.startsWith('{')) {
    // 如果不是以[或{开始，尝试找到第一个[或{
    const startIndex = Math.max(fixed.indexOf('['), fixed.indexOf('{'));
    if (startIndex > 0) {
      fixed = fixed.substring(startIndex);
    }
  }

  if (fixed !== jsonStr) {
    console.log(`[${getTimestamp()}] 🔧 [后端-${requestId}] JSON格式已修复`);
    console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 修复前长度: ${jsonStr.length}, 修复后长度: ${fixed.length}`);
    console.log(`[${getTimestamp()}] 📝 [后端-${requestId}] 修复后预览: ${fixed.substring(0, 200)}...`);
  }

  return fixed;
}

/**
 * 从文本中提取基本信息（备用方案）
 */
function extractBasicInfo(content, requestId) {
  console.log(`[${getTimestamp()}] 🔍 [后端-${requestId}] 尝试从文本中提取基本信息...`);
  
  const people = [];
  const lines = content.split('\n');
  let id = 1;
  
  lines.forEach(line => {
    // 查找包含世代信息的行
    if (line.includes('世：') || line.includes('代：')) {
      const names = line.split('：')[1]?.split('、') || [];
      names.forEach(name => {
        if (name.trim()) {
          people.push({
            id: id++,
            name: name.trim(),
            g_rank: 1,
            rank_index: id - 1,
            g_father_id: 0,
            official_position: null,
            summary: null,
            adoption: "none",
            sex: "MAN",
            g_mother_id: null,
            birth_date: null,
            id_card: null,
            face_img: "",
            photos: null,
            household_info: null,
            spouse: null,
            home_page: null,
            dealth: null,
            formal_name: null,
            location: null,
            childrens: null
          });
        }
      });
    }
  });
  
  console.log(`[${getTimestamp()}] 🔍 [后端-${requestId}] 从文本中提取到 ${people.length} 个人物`);
  return people;
}

// ==================== 租户管理API ====================

// 获取所有租户
app.get('/api/tenants', async (req, res) => {
  try {
    console.log(`🏢 [${getTimestamp()}] 获取租户列表请求`);

    const tenants = await tenantService.getAllTenants();

    res.json({
      success: true,
      data: tenants,
      count: tenants.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${getTimestamp()}] 获取租户列表失败:`, error);
    res.status(500).json({
      error: '获取租户列表失败',
      message: error.message
    });
  }
});

// 获取指定租户信息
app.get('/api/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    console.log(`🏢 [${getTimestamp()}] 获取租户信息请求 - 租户: ${tenantId}`);

    const tenant = await tenantService.getTenant(tenantId);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: '租户不存在',
        message: `租户 ${tenantId} 不存在`
      });
    }

    res.json({
      success: true,
      tenant: tenant,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${getTimestamp()}] 获取租户信息失败:`, error);
    res.status(500).json({
      error: '获取租户信息失败',
      message: error.message
    });
  }
});

// 创建或更新租户
app.post('/api/tenants', async (req, res) => {
  try {
    const tenantData = req.body;
    console.log(`🏢 [${getTimestamp()}] 创建租户请求:`, {
      id: tenantData.id,
      name: tenantData.name
    });

    if (!tenantData.name) {
      return res.status(400).json({
        success: false,
        error: '缺少租户名称',
        message: '租户名称是必填项'
      });
    }

    // 如果没有提供ID，生成一个
    if (!tenantData.id) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      tenantData.id = `tenant_${timestamp}_${random}`;
    }

    const tenant = await tenantService.createOrUpdateTenant(tenantData.id, tenantData);

    res.json({
      success: true,
      tenant: tenant,
      message: '租户创建成功',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${getTimestamp()}] 创建租户失败:`, error);
    res.status(500).json({
      success: false,
      error: '创建租户失败',
      message: error.message
    });
  }
});

// 删除租户
app.delete('/api/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    console.log(`🗑️ [${getTimestamp()}] 删除租户请求 - 租户: ${tenantId}`);

    if (tenantId === 'default') {
      return res.status(400).json({
        success: false,
        error: '不能删除默认租户',
        message: '默认租户不能被删除'
      });
    }

    const result = await tenantService.deleteTenant(tenantId);

    res.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${getTimestamp()}] 删除租户失败:`, error);
    res.status(500).json({
      error: '删除租户失败',
      message: error.message
    });
  }
});

// 获取租户统计信息
app.get('/api/tenants/:tenantId/stats', async (req, res) => {
  try {
    const { tenantId } = req.params;
    console.log(`📊 [${getTimestamp()}] 获取租户统计请求 - 租户: ${tenantId}`);

    const stats = await tenantService.getTenantStats(tenantId);

    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${getTimestamp()}] 获取租户统计失败:`, error);
    res.status(500).json({
      error: '获取租户统计失败',
      message: error.message
    });
  }
});

// ==================== 家谱数据管理API ====================

// 保存家谱数据到数据库
app.post('/api/family-data/save', async (req, res) => {
  try {
    const { tenantId, familyData } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: '缺少租户ID' });
    }

    if (!familyData || !Array.isArray(familyData)) {
      return res.status(400).json({ error: '家谱数据格式错误' });
    }

    console.log(`📊 [${new Date().toISOString()}] 保存家谱数据请求 - 租户: ${tenantId}, 数据条数: ${familyData.length}`);

    // 确保租户存在
    let tenant = await tenantService.getTenant(tenantId);
    if (!tenant) {
      await tenantService.createOrUpdateTenant(tenantId, {
        name: `族谱_${tenantId}`,
        description: '自动创建的族谱'
      });
    }

    // 保存家谱数据
    const result = await familyDataService.saveFamilyData(tenantId, familyData);

    res.json({
      success: true,
      message: result.message,
      savedCount: result.savedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] 保存家谱数据失败:`, error);
    res.status(500).json({
      error: '保存家谱数据失败',
      message: error.message
    });
  }
});

// 获取家谱数据
app.get('/api/family-data/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    console.log(`📖 [${new Date().toISOString()}] 获取家谱数据请求 - 租户: ${tenantId}`);

    const familyData = await familyDataService.getFamilyData(tenantId);

    res.json({
      success: true,
      data: familyData,
      count: familyData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${getTimestamp()}] 获取家谱数据失败:`, error);
    res.status(500).json({
      error: '获取家谱数据失败',
      message: error.message
    });
  }
});

// 获取默认家谱数据（特殊接口）
app.get('/api/family-data/default', async (req, res) => {
  try {
    console.log(`📖 [${new Date().toISOString()}] 获取默认家谱数据请求`);

    const familyData = await familyDataService.getFamilyData('default');

    res.json({
      success: true,
      data: familyData,
      count: familyData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${getTimestamp()}] 获取默认家谱数据失败:`, error);
    res.status(500).json({
      error: '获取默认家谱数据失败',
      message: error.message
    });
  }
});

// 重新初始化默认家谱数据
app.post('/api/reinit-default-data', async (req, res) => {
  try {
    console.log(`🔄 [${new Date().toISOString()}] 重新初始化默认家谱数据请求`);

    // 强制重新加载默认穆氏族谱数据
    await tenantService.forceInitializeDefaultFamilyData();

    res.json({
      success: true,
      message: '默认家谱数据重新初始化完成',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] 重新初始化默认家谱数据失败:`, error);
    res.status(500).json({
      error: '重新初始化失败',
      message: error.message
    });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error(`[${getTimestamp()}] ❌ 服务器错误:`, error);
  res.status(500).json({
    error: '服务器内部错误',
    message: error.message
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '接口不存在',
    message: `路径 ${req.path} 不存在`
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
🚀 ========== 家谱创作工具后端服务启动成功 ==========
📡 服务地址: http://localhost:${PORT}
🔗 健康检查: http://localhost:${PORT}/health
🔄 OCR端点: http://localhost:${PORT}/api/qwen/ocr
💾 家谱数据API: http://localhost:${PORT}/api/family-data
🔐 认证API: http://localhost:${PORT}/api/auth
⏰ 启动时间: ${new Date().toISOString()}
=====================================`);
});

module.exports = app;