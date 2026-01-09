// Vercel Serverless Function for Tenant Management API
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

  if (req.method === 'GET') {
    try {
      // 验证JWT令牌
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (token) {
        // 如果提供了令牌，验证它
        const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
        
        try {
          jwt.verify(token, jwtSecret);
        } catch (error) {
          return res.status(403).json({ error: '令牌无效或已过期' });
        }
      }

      // 返回默认租户信息（所有用户都可以访问）
      const defaultTenant = {
        id: process.env.REACT_APP_DEFAULT_TENANT_ID || 'default',
        name: '穆家家谱 (默认)',
        description: '默认家谱数据',
        createdAt: new Date().toISOString(),
        isDefault: true,
      };

      // 如果用户已认证，也可以返回他们的租户
      let userTenants = [];
      if (token) {
        let userId;
        try {
          const decoded = jwt.verify(token, jwtSecret);
          userId = decoded.userId;
        } catch (error) {
          // 如果令牌验证失败，继续使用默认租户
        }

        if (userId) {
          // 这里可以根据用户获取他们的租户列表
          // 简单起见，我们返回默认租户加上用户自己的租户信息
          userTenants = [{
            id: `user_${userId}`,
            name: '我的家谱',
            description: '用户专属家谱',
            createdAt: new Date().toISOString(),
            isDefault: false,
          }];
        }
      }

      const allTenants = [defaultTenant, ...userTenants];

      res.json({
        success: true,
        data: allTenants,
        count: allTenants.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取租户列表失败:', error);
      res.status(500).json({
        error: '获取租户列表失败',
        message: error.message
      });
    }
  } else if (req.method === 'POST') {
    // 创建租户
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '访问令牌缺失' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
    
    let userId;
    try {
      const decoded = jwt.verify(token, jwtSecret);
      userId = decoded.userId;
    } catch (error) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }

    const tenantData = req.body;

    if (!tenantData.name) {
      return res.status(400).json({
        success: false,
        error: '缺少租户名称',
        message: '租户名称是必填项'
      });
    }

    try {
      // 如果没有提供ID，生成一个
      if (!tenantData.id) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        tenantData.id = `tenant_${timestamp}_${random}`;
      }

      // 在实际实现中，我们会在这里创建租户记录
      // 但现在我们只是返回创建的信息
      const tenant = {
        id: tenantData.id,
        name: tenantData.name,
        description: tenantData.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: false,
        settings: {
          nameProtection: tenantData.nameProtection || false,
          publicAccess: tenantData.publicAccess || false,
          ...tenantData.settings,
        },
      };

      res.json({
        success: true,
        tenant: tenant,
        message: '租户创建成功',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建租户失败:', error);
      res.status(500).json({
        success: false,
        error: '创建租户失败',
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
  // 注意：在Vercel无服务器函数中，不需要手动断开连接，因为函数结束后会自动释放资源
  // 断开Prisma连接
  // await prisma.$disconnect();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};