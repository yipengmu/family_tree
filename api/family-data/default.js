// Vercel Serverless Function for Default Family Data API
// 导入完整的穆氏族谱数据
import dbJson from '../data/familyData.js';

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Tenant-ID, X-Tenant-Name'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // 使用导入的完整穆氏族谱数据
      const familyData = dbJson;
      
      console.log(`📊 返回默认家谱数据: ${familyData.length} 条记录`);

      res.json({
        success: true,
        data: familyData,
        count: familyData.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取默认家庭数据失败:', error);
      res.status(500).json({
        error: '获取默认家庭数据失败',
        message: error.message
      });
    }
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
