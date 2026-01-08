// Vercel Serverless Function for Send Verification Code API
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

// 初始化Prisma客户端
const prisma = new PrismaClient();

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
    // 检查是否已在60秒内发送过验证码
    const now = Date.now();
    
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
    const transactionResult = await prisma.$transaction([
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

    // 检查邮件服务是否配置
    const emailConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };

    const isEmailConfigured = emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass;

    if (isEmailConfigured) {
      // 如果邮件服务已配置，尝试发送邮件
      try {
        const transporter = nodemailer.createTransporter(emailConfig);

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: `家谱创作工具 - ${purpose === 'register' ? '注册' : '密码重置'}验证码`,
          text: `您的验证码是: ${code}，有效期5分钟。如果不是本人操作，请忽略此邮件。`,
          html: `<p>您的验证码是: <strong>${code}</strong>，有效期5分钟。</p><p>如果不是本人操作，请忽略此邮件。</p>`,
        };

        await transporter.sendMail(mailOptions);
        
        res.status(200).json({
          success: true,
          message: '验证码已发送',
          timestamp: new Date().toISOString()
        });
      } catch (emailError) {
        console.error('邮件发送失败:', emailError);
        // 即使邮件发送失败，也要返回成功（因为验证码已存储在数据库中）
        res.status(200).json({
          success: true,
          message: '验证码已生成（邮件发送失败，请检查邮箱设置）',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 在开发环境中，如果没有配置邮件服务，记录验证码到控制台以便调试
      console.log(`⚠️ 邮件服务未配置，验证码: ${code} (有效期5分钟) - 仅用于开发调试`);
      res.status(200).json({
        success: true,
        message: process.env.NODE_ENV === 'development' 
          ? '验证码已生成（开发环境，验证码: ' + code + '）' 
          : '验证码已生成',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '发送验证码失败'
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