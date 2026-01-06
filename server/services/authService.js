const User = require('../models/user');
const { sendVerificationCode, validateEmailConfig } = require('./emailService');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// 尝试连接Redis，如果失败则使用内存存储
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

  // 连接Redis
  const connectRedis = async () => {
    if (redisClient && !redisClient.isOpen) {
      try {
        await redisClient.connect();
        useRedis = true;
        console.log('✅ Redis连接成功');
      } catch (error) {
        console.warn('⚠️ Redis连接失败，将使用内存存储:', error.message);
        useRedis = false;
      }
    }
  };

  connectRedis();
} catch (error) {
  console.warn('⚠️ Redis模块未安装，将使用内存存储:', error.message);
  useRedis = false;
}

// 内存存储验证码（Redis不可用时的降级方案）
const inMemoryStore = new Map();
const rateLimitStore = new Map();

// 生成验证码
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString(); // 6位数字验证码
};

// 发送验证码
const sendVerificationCodeByEmail = async (email, purpose = 'register') => {
  // 检查是否已在60秒内发送过验证码
  const now = Date.now();
  const rateLimitKey = `rate_limit:${email}`;
  const lastSendTime = useRedis ? await redisClient.get(rateLimitKey) : rateLimitStore.get(rateLimitKey);
  
  if (lastSendTime && (now - parseInt(lastSendTime)) < 60000) { // 60秒内不能再次发送
    throw new Error('请在60秒后重试');
  }

  // 如果是注册，检查邮箱是否已存在
  if (purpose === 'register') {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('该邮箱已被注册');
    }
  }

  // 生成验证码
  const code = generateVerificationCode();

  // 存储验证码
  const codeKey = `verify_code:${email}`;
  if (useRedis) {
    // 存储验证码到Redis，5分钟过期
    await redisClient.setEx(codeKey, 300, code); // 300秒 = 5分钟
    // 设置速率限制，60秒内不能再次发送
    await redisClient.setEx(rateLimitKey, 60, now.toString());
  } else {
    // 存储验证码到内存，5分钟过期
    inMemoryStore.set(codeKey, { code, expiresAt: now + 300000 }); // 5分钟 = 300000毫秒
    // 设置速率限制，60秒内不能再次发送
    rateLimitStore.set(rateLimitKey, now.toString());
    
    // 设置过期清理定时器
    setTimeout(() => {
      inMemoryStore.delete(codeKey);
      rateLimitStore.delete(rateLimitKey);
    }, 300000); // 5分钟后清理
  }

  // 检查邮件服务是否配置
  const isEmailConfigured = validateEmailConfig();
  
  if (isEmailConfigured) {
    // 如果邮件服务已配置，尝试发送邮件
    try {
      await sendVerificationCode(email, code, purpose);
      console.log(`✅ 验证码已发送至 ${email}`);
      return { success: true, message: '验证码已发送' };
    } catch (emailError) {
      console.error(`❌ 邮件发送失败:`, emailError.message);
      // 即使邮件发送失败，也要保留验证码，但返回包含错误信息的成功响应
      console.log(`⚠️ 验证码已生成但邮件发送失败，验证码: ${code} (有效期5分钟) - 仅用于开发调试`);
      return { success: true, message: '验证码已生成（邮件发送失败，验证码已保存供开发调试使用）', code: process.env.NODE_ENV === 'development' ? code : undefined };
    }
  } else {
    // 在开发环境中，如果没有配置邮件服务，记录验证码到控制台以便调试
    console.log(`⚠️ 邮件服务未配置，验证码: ${code} (有效期5分钟) - 仅用于开发调试`);
    return { success: true, message: '验证码已生成（开发环境）', code: process.env.NODE_ENV === 'development' ? code : undefined };
  }
};

// 验证验证码
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
      // 清理过期的验证码
      inMemoryStore.delete(codeKey);
    }
  }
  
  if (!storedCode || storedCode !== code) {
    return false;
  }

  // 验证成功后删除验证码
  if (useRedis) {
    await redisClient.del(codeKey);
  } else {
    inMemoryStore.delete(codeKey);
  }
  
  return true;
};

// 用户注册
const registerUser = async (userData) => {
  const { name, email, password, code } = userData;

  // 验证验证码
  const isValidCode = await verifyCode(email, code);
  if (!isValidCode) {
    throw new Error('验证码错误或已过期');
  }

  // 创建用户
  const newUser = await User.create({
    username: name,
    email,
    password,
  });

  return newUser;
};

// 用户登录
const loginUser = async (email, password) => {
  // 查找用户
  const user = await User.findByEmail(email);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 验证密码
  const isValidPassword = await User.validatePassword(user, password);
  if (!isValidPassword) {
    throw new Error('密码错误');
  }

  // 更新最后登录时间
  await User.updateLastLogin(user.id);

  return user;
};

// 生成JWT Token
const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_development';
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