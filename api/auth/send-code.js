// Vercel Serverless Function for Send Verification Code API
// 统一使用 Prisma + PostgreSQL 数据库
import prisma, { ensureConnection } from '../../lib/prisma.js';
import { isTencentMailConfigured, sendVerificationEmail } from '../../lib/tencentMail.js';

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

  const { email, purpose } = req.body;

  if (!email) {
    return res.status(400).json({ error: '邮箱地址是必需的' });
  }

  if (!purpose || !['register', 'reset'].includes(purpose)) {
    return res.status(400).json({ error: '验证码用途必须是 register 或 reset' });
  }

  try {
    if (!isTencentMailConfigured()) {
      return res.status(503).json({
        success: false,
        error: '腾讯云邮件服务未配置，请联系管理员'
      });
    }

    // 检查 DATABASE_URL 是否配置
    if (!process.env.DATABASE_URL) {
      console.error('[验证码] DATABASE_URL 未配置！');
      return res.status(500).json({ success: false, error: '数据库未配置' });
    }
    
    // 预热数据库连接（Neon 冷启动可能需要重试）
    await ensureConnection();

    // 检查是否已在60秒内发送过验证码
    // 检查速率限制
    const recentRateLimit = await prisma.verificationCode.findFirst({
      where: {
        email: email,
        purpose: 'rate_limit',
        expires_at: {
          gte: new Date() // 确保未过期
        }
      }
    });

    if (recentRateLimit) {
      return res.status(429).json({ 
        success: false,
        error: '请在60秒后重试' 
      });
    }

    // 如果是注册，检查邮箱是否存在
    if (purpose === 'register') {
      const existingUser = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: '该邮箱已被注册'
        });
      }
    }

    // 生成验证码
    const crypto = await import('crypto');
    const code = crypto.randomInt(100000, 999999).toString();

    // 开始数据库事务
    await prisma.$transaction([
      // 删除过期的验证码
      prisma.verificationCode.deleteMany({
        where: {
          email: email,
          expires_at: {
            lt: new Date() // 过期的验证码
          }
        }
      }),
      // 保存新的验证码
      prisma.verificationCode.create({
        data: {
          email: email,
          code: code,
          purpose: purpose,
          expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后过期
        }
      }),
      // 保存速率限制记录
      prisma.verificationCode.create({
        data: {
          email: email,
          code: 'RATE_LIMIT',
          purpose: 'rate_limit',
          expires_at: new Date(Date.now() + 60 * 1000), // 60秒后过期
        }
      })
    ]);

    try {
      await sendVerificationEmail({ to: email, code, purpose });
    } catch (emailError) {
      // 邮件失败时清理已写入的验证码，避免用户收到无效验证码。
      await prisma.verificationCode.deleteMany({
        where: {
          email,
          OR: [
            { code, purpose },
            { code: 'RATE_LIMIT', purpose: 'rate_limit' },
          ],
        },
      });
      console.error('[验证码] 腾讯云邮件发送失败:', emailError.message);
      return res.status(502).json({
        success: false,
        error: '验证码邮件发送失败，请稍后重试'
      });
    }

    return res.status(200).json({
      success: true,
      message: '验证码已发送',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '发送验证码失败'
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
