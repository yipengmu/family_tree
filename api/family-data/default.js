// Vercel Serverless Function for Default Family Data API
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

  if (req.method === 'GET') {
    try {
      // 返回默认的穆家家谱数据
      const familyData = [
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