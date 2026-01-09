// Vercel Serverless Function for Registration API
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// 优化Prisma客户端初始化，适配Vercel环境
let prisma;

if (process.env.NODE_ENV === 'production') {
  // 在生产环境中使用全局缓存避免重复初始化
  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient();
  }
  prisma = global.__prisma__;
} else {
  // 在开发环境中直接创建新实例
  prisma = new PrismaClient();
}

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

    // 验证验证码
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email: email,
        code: code,
        purpose: 'register', // 验证码用途应为注册
        expires_at: {
          gte: new Date() // 确保未过期
        }
      }
    });

    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        error: '验证码错误或已过期'
      });
    }

    // 验证码正确，删除它（一次性使用）
    await prisma.verificationCode.delete({
      where: {
        id: verificationCode.id
      }
    });

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