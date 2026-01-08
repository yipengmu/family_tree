// Vercel Serverless Function for Get Specific Tenant API
import jwt from 'jsonwebtoken';

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

  const { tenantId } = req.query;

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

      // 根据tenantId返回租户信息
      let tenant;
      if (tenantId === 'default' || tenantId === process.env.REACT_APP_DEFAULT_TENANT_ID) {
        tenant = {
          id: tenantId,
          name: '穆家家谱 (默认)',
          description: '默认家谱数据',
          createdAt: new Date().toISOString(),
          isDefault: true,
        };
      } else {
        // 验证用户是否已认证以访问非默认租户
        if (!token) {
          return res.status(401).json({
            success: false,
            error: '需要登录才能访问此租户',
            message: `租户 ${tenantId} 需要登录才能访问`
          });
        }

        tenant = {
          id: tenantId,
          name: '我的家谱',
          description: '用户专属家谱',
          createdAt: new Date().toISOString(),
          isDefault: false,
        };
      }

      res.json({
        success: true,
        tenant: tenant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取租户信息失败:', error);
      res.status(500).json({
        error: '获取租户信息失败',
        message: error.message
      });
    }
  } else if (req.method === 'DELETE') {
    // 删除租户
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '访问令牌缺失' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.userId;
    } catch (error) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }

    if (tenantId === 'default' || tenantId === process.env.REACT_APP_DEFAULT_TENANT_ID) {
      return res.status(400).json({
        success: false,
        error: '不能删除默认租户',
        message: '默认租户不能被删除'
      });
    }

    // 在实际实现中，我们会删除租户记录
    // 现在我们只是返回成功消息
    res.json({
      success: true,
      message: '租户删除成功',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};