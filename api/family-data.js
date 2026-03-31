// Vercel Serverless Function for Family Data API
// 统一使用 Prisma + PostgreSQL 数据库
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

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

  // 从请求头获取租户ID
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const isDefaultTenant = tenantId === 'default' || tenantId === process.env.REACT_APP_DEFAULT_TENANT_ID;

  if (req.method === 'GET') {
    try {
      let familyData = [];

      if (isDefaultTenant) {
        // 对于默认租户，返回固定的穆家家谱数据
        // 这是从src/data/familyData.js导出的数据结构
        familyData = [
          {
            "id": 1,
            "name": "穆毅鹏",
            "g_rank": 1,
            "rank_index": 1,
            "g_father_id": 0,
            "sex": "MAN",
            "adoption": "none",
            "official_position": "",
            "summary": "穆氏家族创始人",
            "birth_date": "1980-01-01",
            "g_mother_id": null,
            "id_card": null,
            "face_img": "",
            "photos": null,
            "household_info": null,
            "spouse": null,
            "home_page": null,
            "dealth": null,
            "formal_name": null,
            "location": null,
            "childrens": null
          }
        ];
      } else {
        // 对于其他租户，从数据库获取数据
        // 验证JWT令牌（对于非默认租户需要认证）
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

        // 从数据库查询家庭数据
        const dbFamilyData = await prisma.familyData.findMany({
          where: {
            tenant_id: tenantId,
          },
          orderBy: {
            g_rank: 'asc'
          }
        });

        familyData = dbFamilyData.map(record => ({
          id: record.id,
          name: record.name,
          g_rank: record.g_rank,
          rank_index: record.rank_index,
          g_father_id: record.g_father_id,
          sex: record.sex,
          adoption: record.adoption,
          official_position: record.official_position,
          summary: record.summary,
          birth_date: record.birth_date,
          g_mother_id: record.g_mother_id,
          id_card: record.id_card,
          face_img: record.face_img,
          photos: record.photos,
          household_info: record.household_info,
          spouse: record.spouse,
          home_page: record.home_page,
          dealth: record.dealth,
          formal_name: record.formal_name,
          location: record.location,
          childrens: record.childrens
        }));
      }

      res.json({
        success: true,
        data: familyData,
        count: familyData.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取家庭数据失败:', error);
      res.status(500).json({
        error: '获取家庭数据失败',
        message: error.message
      });
    }
  } else if (req.method === 'POST') {
    // 保存家庭数据
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

    const { tenantId: bodyTenantId, familyData } = req.body;

    if (!bodyTenantId) {
      return res.status(400).json({ error: '缺少租户ID' });
    }

    if (!familyData || !Array.isArray(familyData)) {
      return res.status(400).json({ error: '家庭数据格式错误' });
    }

    console.log(`📊 保存家庭数据请求 - 租户: ${bodyTenantId}, 数据条数: ${familyData.length}`);

    // 先删除现有数据
    await prisma.familyData.deleteMany({
      where: {
        tenant_id: bodyTenantId,
      },
    });

    // 批量插入新数据
    if (familyData.length > 0) {
      const dataToInsert = familyData.map(item => ({
        tenant_id: bodyTenantId,
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
      message: '家庭数据保存成功',
      savedCount: familyData.length,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
  // 注意：在Vercel无服务器函数中，不需要手动断开连接，因为函数结束后会自动释放资源
  // 断开Prisma连接
  // await prisma.$disconnect();
}