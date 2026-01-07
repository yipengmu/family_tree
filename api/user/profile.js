// Vercel Serverless Function for User Profile
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.userId;

    // 从数据库获取用户信息
    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        created_at: true,
        last_login_at: true,
        wechat_openid: true  // 根据项目规范，包含微信openid字段
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        wechatOpenid: user.wechat_openid  // 根据项目规范返回微信openid
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token验证失败:', error);
    res.status(403).json({ error: '令牌无效或已过期' });
  } finally {
    // 断开Prisma连接
    await prisma.$disconnect();
  }
}