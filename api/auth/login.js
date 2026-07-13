// Vercel Serverless Function for Login API
// 统一使用 Prisma + PostgreSQL 数据库
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma, { ensureConnection } from '../../lib/prisma.js';
import { getJwtSecret } from '../../lib/auth.js';

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
    // 预热数据库连接（Neon 冷启动可能需要重试）
    await ensureConnection();

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
    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '24h' });

    // 兼容早期账号：首次登录时补齐真实的家谱归属关系。
    let membership = await prisma.tenantMembership.findFirst({
      where: { user_id: user.id, status: 'ACTIVE' },
      include: { tenant: true },
      orderBy: { created_at: 'asc' },
    });
    if (!membership) {
      membership = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.upsert({
          where: { id: `user_${user.id}` },
          update: {},
          create: {
            id: `user_${user.id}`,
            name: `${user.username}的家谱`,
            description: '我的私密数字家谱',
            settings: JSON.stringify({ publicAccess: false, livingPersonPrivacy: true, nameProtection: true }),
          },
        });
        return tx.tenantMembership.create({
          data: { tenant_id: tenant.id, user_id: user.id, role: 'OWNER' },
          include: { tenant: true },
        });
      });
    }

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
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        description: membership.tenant.description,
        role: membership.role,
        isDefault: false,
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
