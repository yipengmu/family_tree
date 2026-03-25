// server/models/user.js
// 用戶模型，統一使用 Prisma + PostgreSQL 數據庫
const prisma = require('../../lib/prisma.cjs');
const bcrypt = require('bcryptjs');

const User = {
  // 創建用戶
  async create(userData) {
    const { username, email, password } = userData;
    
    // 對密碼進行哈希加密
    const password_hash = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
      },
    });
    
    // 返回用戶信息，但不包含密碼哈希
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // 根據郵箱查找用戶
  async findByEmail(email) {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    
    return user;
  },

  // 根據ID查找用戶
  async findById(id) {
    const user = await prisma.user.findUnique({
      where: {
        id: Number(id),
      },
    });
    
    return user;
  },

  // 更新最後登錄時間
  async updateLastLogin(userId) {
    await prisma.user.update({
      where: {
        id: Number(userId),
      },
      data: {
        last_login_at: new Date(),
      },
    });
  },

  // 驗證密碼
  async validatePassword(user, password) {
    if (!user || !user.password_hash) {
      return false;
    }
    return await bcrypt.compare(password, user.password_hash);
  },
  
  // 更新微信OpenID
  async updateWechatOpenid(userId, wechatOpenid) {
    const updatedUser = await prisma.user.update({
      where: {
        id: Number(userId),
      },
      data: {
        wechat_openid: wechatOpenid,
      },
    });
    
    return updatedUser;
  },
  
  // 根據微信OpenID查找用戶
  async findByWechatOpenid(wechatOpenid) {
    const user = await prisma.user.findUnique({
      where: {
        wechat_openid: wechatOpenid,
      },
    });
    
    return user;
  },
  
  // 初始化用戶表（為了與舊代碼兼容）
  async initializeTable() {
    // 在Prisma模式中，表結構由Prisma自動處理
    console.log('✅ 使用Prisma，無需手動初始化表');
    return Promise.resolve();
  }
};

module.exports = User;