// Vercel Serverless Function for Login API
// 统一使用 Prisma + PostgreSQL 数据库
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';

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
  // 注意：在Vercel无服务器函数中，不需要手动断开连接，因为函数结束后会自动释放资源
  // finally {
  //   // 断开Prisma连接
  //   await prisma.$disconnect();
  // }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};