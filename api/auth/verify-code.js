// Vercel Serverless Function for Verify Verification Code API
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

  const { email, code, purpose } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: '邮箱和验证码都是必需的' });
  }

  try {
    // 查找验证码
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email: email,
        code: code,
        purpose: purpose || 'register', // 默认用途为注册
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

    // 验证成功后删除验证码
    await prisma.verificationCode.delete({
      where: {
        id: verificationCode.id
      }
    });

    res.status(200).json({
      success: true,
      message: '验证码验证成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('验证验证码错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '验证验证码失败'
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