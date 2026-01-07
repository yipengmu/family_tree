const User = require('../models/user'); // 更新为正确的文件名
const { sendVerificationCode, validateEmailConfig } = require('./emailService');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// 尝試連接Redis，如果失敗則使用內存存儲
let redisClient;
let useRedis = false;

try {
  const redis = require('redis');
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  // 連接Redis
  const connectRedis = async () => {
    if (redisClient && !redisClient.isOpen) {
      try {
        await redisClient.connect();
        useRedis = true;
        console.log('✅ Redis連接成功');
      } catch (error) {
        console.warn('⚠️ Redis連接失敗，將使用內存存儲:', error.message);
        useRedis = false;
      }
    }
  };

  connectRedis();
} catch (error) {
  console.warn('⚠️ Redis模塊未安裝，將使用內存存儲:', error.message);
  useRedis = false;
}

// 內存存儲驗證碼（Redis不可用時的降級方案）
const inMemoryStore = new Map();
const rateLimitStore = new Map();

// 生成驗證碼
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString(); // 6位數字驗證碼
};

// 發送驗證碼
const sendVerificationCodeByEmail = async (email, purpose = 'register') => {
  // 檢查是否已在60秒內發送過驗證碼
  const now = Date.now();
  const rateLimitKey = `rate_limit:${email}`;
  const lastSendTime = useRedis ? await redisClient.get(rateLimitKey) : rateLimitStore.get(rateLimitKey);
  
  if (lastSendTime && (now - parseInt(lastSendTime)) < 60000) { // 60秒內不能再次發送
    throw new Error('請在60秒後重試');
  }

  // 如果是註冊，檢查郵箱是否存在
  if (purpose === 'register') {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('該郵箱已被註冊');
    }
  }

  // 生成驗證碼
  const code = generateVerificationCode();

  // 存儲驗證碼
  const codeKey = `verify_code:${email}`;
  if (useRedis) {
    // 存儲驗證碼到Redis，5分鐘過期
    await redisClient.setEx(codeKey, 300, code); // 300秒 = 5分鐘
    // 設定速率限制，60秒內不能再次發送
    await redisClient.setEx(rateLimitKey, 60, now.toString());
  } else {
    // 存儲驗證碼到內存，5分鐘過期
    inMemoryStore.set(codeKey, { code, expiresAt: now + 300000 }); // 5分鐘 = 300000毫秒
    // 設定速率限制，60秒內不能再次發送
    rateLimitStore.set(rateLimitKey, now.toString());
    
    // 設定過期清理定時器
    setTimeout(() => {
      inMemoryStore.delete(codeKey);
      rateLimitStore.delete(rateLimitKey);
    }, 300000); // 5分鐘後清理
  }

  // 檢查郵件服務是否配置
  const isEmailConfigured = validateEmailConfig();
  
  if (isEmailConfigured) {
    // 如果郵件服務已配置，嘗試發送郵件
    try {
      await sendVerificationCode(email, code, purpose);
      console.log(`✅ 驗證碼已發送至 ${email}`);
      return { success: true, message: '驗證碼已發送' };
    } catch (emailError) {
      console.error(`❌ 郵件發送失敗:`, emailError.message);
      // 即使郵件發送失敗，也要保留驗證碼，但返回包含錯誤信息的成功響應
      console.log(`⚠️ 驗證碼已生成但郵件發送失敗，驗證碼: ${code} (有效期5分鐘) - 僅用於開發調試`);
      return { success: true, message: '驗證碼已生成（郵件發送失敗，驗證碼已保存供開發調試使用）', code: process.env.NODE_ENV === 'development' ? code : undefined };
    }
  } else {
    // 在開發環境中，如果沒有配置郵件服務，記錄驗證碼到控制台以便調試
    console.log(`⚠️ 郵件服務未配置，驗證碼: ${code} (有效期5分鐘) - 僅用於開發調試`);
    return { success: true, message: '驗證碼已生成（開發環境）', code: process.env.NODE_ENV === 'development' ? code : undefined };
  }
};

// 驗證驗證碼
const verifyCode = async (email, code) => {
  const codeKey = `verify_code:${email}`;
  
  let storedCode;
  if (useRedis) {
    storedCode = await redisClient.get(codeKey);
  } else {
    const stored = inMemoryStore.get(codeKey);
    if (stored && stored.expiresAt > Date.now()) {
      storedCode = stored.code;
    } else {
      // 清理過期的驗證碼
      inMemoryStore.delete(codeKey);
    }
  }
  
  if (!storedCode || storedCode !== code) {
    return false;
  }

  // 驗證成功後刪除驗證碼
  if (useRedis) {
    await redisClient.del(codeKey);
  } else {
    inMemoryStore.delete(codeKey);
  }
  
  return true;
};

// 用戶註冊
const registerUser = async (userData) => {
  const { name, email, password, code } = userData;

  // 驗證驗證碼
  const isValidCode = await verifyCode(email, code);
  if (!isValidCode) {
    throw new Error('驗證碼錯誤或已過期');
  }

  // 創建用戶
  const newUser = await User.create({
    username: name,
    email,
    password,
  });

  return newUser;
};

// 用戶登錄
const loginUser = async (email, password) => {
  // 查找用戶
  const user = await User.findByEmail(email);
  if (!user) {
    throw new Error('用戶不存在');
  }

  // 驗證密碼
  const isValidPassword = await User.validatePassword(user, password);
  if (!isValidPassword) {
    throw new Error('密碼錯誤');
  }

  // 更新最後登錄時間
  await User.updateLastLogin(user.id);

  return user;
};

// 生成JWT Token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_development';
  
  // 在生產環境中，如果JWT_SECRET未設置，記錄警告
  if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'development') {
    console.warn('⚠️ 警告: JWT_SECRET 環境變量未設置，使用默認密鑰。請在線上環境中設置JWT_SECRET環境變量。');
  }
  
  const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '24h' });
  return token;
};

module.exports = {
  sendVerificationCodeByEmail,
  verifyCode,
  registerUser,
  loginUser,
  generateToken,
};