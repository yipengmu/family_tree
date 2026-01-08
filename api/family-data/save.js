// Vercel Serverless Function for Save Family Data API
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
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Tenant-ID, X-Tenant-Name'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证JWT令牌
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

  const { tenantId, familyData } = req.body;

  if (!tenantId) {
    return res.status(400).json({ error: '缺少租户ID' });
  }

  if (!familyData || !Array.isArray(familyData)) {
    return res.status(400).json({ error: '家谱数据格式错误' });
  }

  console.log(`📊 保存家谱数据请求 - 租户: ${tenantId}, 数据条数: ${familyData.length}`);

  try {
    // 先删除现有数据
    await prisma.familyData.deleteMany({
      where: {
        tenant_id: tenantId,
      },
    });

    // 批量插入新数据
    if (familyData.length > 0) {
      const dataToInsert = familyData.map(item => ({
        tenant_id: tenantId,
        ...item,
        created_at: item.created_at ? new Date(item.created_at) : new Date(),
        updated_at: new Date()
      }));

      await prisma.familyData.createMany({
        data: dataToInsert,
      });
    }

    res.json({
      success: true,
      message: '家谱数据保存成功',
      savedCount: familyData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('保存家谱数据失败:', error);
    res.status(500).json({
      error: '保存家谱数据失败',
      message: error.message
    });
  } finally {
    // 断开Prisma连接
    await prisma.$disconnect();
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};