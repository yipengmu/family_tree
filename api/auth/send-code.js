// Vercel Serverless Function for Send Verification Code API
// 统一使用 Prisma + PostgreSQL 数据库
import prisma from '../../lib/prisma.js';

// 邮件发送函数 - 支持 Resend API
async function sendEmail({ to, subject, text, html }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  console.log('[邮件发送] 检查 RESEND_API_KEY:', resendApiKey ? '已配置 (' + resendApiKey.substring(0, 10) + '...)' : '未配置');
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY 未配置');
  }
  
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  console.log('[邮件发送] 发件人:', fromEmail);
  console.log('[邮件发送] 收件人:', to);
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject,
        text: text,
        html: html,
      }),
    });
    
    console.log('[邮件发送] Resend API 响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[邮件发送] Resend API 错误:', errorText);
      throw new Error(`Resend API 错误: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[邮件发送] 成功:', result);
    return result;
  } catch (error) {
    console.error('[邮件发送] 请求异常:', error.message);
    throw error;
  }
}

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

    // 检查 Resend API 是否配置
    const isResendConfigured = process.env.RESEND_API_KEY;
    console.log('[验证码] 环境检查 - RESEND_API_KEY:', isResendConfigured ? '已配置 (' + isResendConfigured.substring(0, 10) + '...)' : '未配置');
    console.log('[验证码] 所有环境变量:', Object.keys(process.env).filter(k => k.includes('RESEND') || k.includes('EMAIL')));
    console.log('[验证码] NODE_ENV:', process.env.NODE_ENV);
    console.log('[验证码] VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('[验证码] 生成的验证码:', code);

    if (isResendConfigured) {
      // 使用 Resend 发送邮件
      try {
        await sendEmail({
          to: email,
          subject: `家谱创作工具 - ${purpose === 'register' ? '注册' : '密码重置'}验证码`,
          text: `您的验证码是: ${code}，有效期5分钟。如果不是本人操作，请忽略此邮件。`,
          html: `<p>您的验证码是: <strong>${code}</strong>，有效期5分钟。</p><p>如果不是本人操作，请忽略此邮件。</p>`,
        });
        
        res.status(200).json({
          success: true,
          message: '验证码已发送',
          timestamp: new Date().toISOString()
        });
      } catch (emailError) {
        console.error('Resend 邮件发送失败:', emailError);
        res.status(200).json({
          success: true,
          message: '验证码已生成（邮件发送失败，请检查配置）',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 未配置邮件服务
      console.log(`⚠️ Resend 未配置，验证码: ${code} (有效期5分钟) - 仅用于开发调试`);
      res.status(200).json({
        success: true,
        message: process.env.NODE_ENV === 'development' 
          ? '验证码已生成（开发环境，验证码: ' + code + '）' 
          : '验证码已生成（邮件服务未配置）',
          timestamp: new Date().toISOString()
      });
    }
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