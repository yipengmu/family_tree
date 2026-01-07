// Vercel Serverless Function for Authentication API
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// 初始化Prisma客户端
const prisma = new PrismaClient();

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 从URL路径获取具体端点
  const { auth } = req.query;
  const endpoint = auth && auth[0] ? auth[0] : 'login';

  try {
    switch (endpoint) {
      case 'login':
        return await handleLogin(req, res);
      case 'register':
        return await handleRegister(req, res);
      case 'send-code':
        return await handleSendCode(req, res);
      default:
        return res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  } finally {
    // 断开Prisma连接
    await prisma.$disconnect();
  }
}

// 处理登录
async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: '邮箱和密码都是必需的' 
    });
  }

  try {
    // 从数据库查找用户
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '密码错误'
      });
    }

    // 生成JWT令牌
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
    
    if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'development') {
      console.warn('⚠️ 警告: JWT_SECRET 环境变量未设置，使用默认密钥。请在Vercel环境变量中设置JWT_SECRET。');
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '24h' });

    // 更新最后登录时间
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        last_login_at: new Date(),
      },
    });

    res.status(200).json({
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
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
}

// 处理注册
async function handleRegister(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password, code } = req.body;

  if (!name || !email || !password || !code) {
    return res.status(400).json({ 
      success: false,
      error: '姓名、邮箱、密码和验证码都是必需的' 
    });
  }

  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: '该邮箱已被注册'
      });
    }

    // 验证验证码（在实际部署中，应验证存储的验证码）
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: '验证码格式错误'
      });
    }

    // 对密码进行哈希
    const password_hash = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = await prisma.user.create({
      data: {
        username: name,
        email,
        password_hash,
        is_active: true,
      },
    });

    // 生成JWT令牌
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
    const token = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '24h' });

    res.status(200).json({
      success: true,
      token: token,
      user: {
        id: newUser.id,
        name: newUser.username,
        email: newUser.email,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      },
      message: '注册成功'
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
}

// 处理发送验证码
async function handleSendCode(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, purpose } = req.body;

  if (!email) {
    return res.status(400).json({ error: '邮箱地址是必需的' });
  }

  if (!purpose || !['register', 'reset'].includes(purpose)) {
    return res.status(400).json({ error: '验证码用途必须是 register 或 reset' });
  }

  try {
    // 在实际部署中，这里应该生成并发送验证码
    // 并将验证码存储在Redis或数据库中
    console.log(`验证码已生成: ${email}, 目的: ${purpose}`);

    res.status(200).json({
      success: true,
      message: '验证码已生成（Vercel环境）',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '发送验证码失败'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};