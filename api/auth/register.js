// Vercel Serverless Function for Registration API
// 统一使用 Prisma + PostgreSQL 数据库
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma, { ensureConnection } from '../../lib/prisma.js';

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

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const code = String(req.body?.code || '').trim();

  if (!name || !email || !password || !code) {
    return res.status(400).json({ 
      success: false,
      error: '姓名、邮箱、密码和验证码都是必需的' 
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: '请输入有效的邮箱地址' });
  }
  if (name.length > 50 || password.length < 6 || password.length > 100 || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: '注册信息格式不正确' });
  }

  try {
    // 预热数据库连接（Neon 冷启动可能需要重试）
    await ensureConnection();

    // 在同一事务内校验并消费验证码，防止验证码被重复注册使用。
    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) throw new Error('该邮箱已被注册');

      const verificationCode = await tx.verificationCode.findFirst({
        where: { email, code, purpose: 'register', expires_at: { gte: new Date() } }
      });
      if (!verificationCode) throw new Error('验证码错误或已过期');

      await tx.verificationCode.delete({ where: { id: verificationCode.id } });
      return tx.user.create({
        data: { username: name, email, password_hash, is_active: true }
      });
    });

    // 生成JWT令牌
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key_for_vercel_deployment';
    const token = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '24h' });

    res.status(200).json({
      success: true,
      token: token,
      user: {
        id: newUser.id,
        name: newUser.username,
        email: newUser.email,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      },
      message: '注册成功'
    });
  } catch (error) {
    console.error('注册错误:', error);
    const clientError = ['该邮箱已被注册', '验证码错误或已过期'].includes(error.message);
    res.status(clientError ? 400 : 500).json({
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
