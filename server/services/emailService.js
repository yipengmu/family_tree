const nodemailer = require('nodemailer');
require('dotenv').config();

// 验证邮件配置
const validateEmailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('警告: 邮件服务未配置。请设置 EMAIL_USER 和 EMAIL_PASS 环境变量。');
    return false;
  }
  return true;
};

// 发送验证码邮件
const sendVerificationCode = async (email, code, purpose = 'register') => {
  if (!validateEmailConfig()) {
    throw new Error('邮件服务未配置');
  }

  let subject, text;
  if (purpose === 'register') {
    subject = 'Family Tree 账户注册验证码';
    text = `欢迎注册 Family Tree！

您的注册验证码是: ${code}

验证码有效期为5分钟，请及时使用。

如果您没有注册 Family Tree 账户，请忽略此邮件。`;
  } else if (purpose === 'reset') {
    subject = 'Family Tree 密码重置验证码';
    text = `您请求重置 Family Tree 账户密码。

您的验证码是: ${code}

验证码有效期为5分钟，请及时使用。

如果您没有请求重置密码，请忽略此邮件。`;
  } else {
    throw new Error('无效的验证码用途');
  }

  // 创建邮件传输器（在发送时创建，避免初始化错误）
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Family Tree" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    text: text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('验证码邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    console.error('发送验证码邮件失败:', error);
    // 根据错误类型提供更具体的错误信息
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      throw new Error('邮件认证失败：用户名或密码错误');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      throw new Error('邮件服务器连接失败：请检查网络连接和SMTP设置');
    } else {
      throw new Error(`邮件发送失败: ${error.message}`);
    }
  }
};

module.exports = {
  sendVerificationCode,
  validateEmailConfig,
};