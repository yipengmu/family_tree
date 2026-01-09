// Vercel Serverless Function for User Profile API
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// 全局缓存Prisma客户端实例，避免重复初始化
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();

// 在开发环境中缓存Prisma客户端实例
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 验证JWT令牌
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.userId;

    if (req.method === 'GET') {
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

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
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(403).json({ error: '令牌无效或已过期' });
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