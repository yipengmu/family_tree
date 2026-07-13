// server/services/emailService.js
// 腾讯云 SES 邮件服务
const { ses } = require('tencentcloud-sdk-nodejs-ses');

let client;

const getMailConfig = () => ({
  secretId: process.env.TENCENTCLOUD_SECRET_ID,
  secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
  region: process.env.TENCENT_SES_REGION || 'ap-guangzhou',
  from: process.env.TENCENT_SES_FROM_EMAIL,
  templateId: Number(process.env.TENCENT_SES_TEMPLATE_ID),
  subject: process.env.TENCENT_SES_SUBJECT || '家谱创作工具验证码',
});

const getClient = () => {
  if (!validateEmailConfig()) {
    throw new Error('腾讯云邮件服务未配置');
  }

  if (!client) {
    const config = getMailConfig();
    client = new ses.v20201002.Client({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey,
      },
      region: config.region,
      profile: {
        httpProfile: {
          reqMethod: 'POST',
          reqTimeout: 8000,
        },
      },
    });
  }

  return client;
};

// 發送驗證碼
const sendVerificationCode = async (email, code, purpose = 'register') => {
  if (!validateEmailConfig()) {
    throw new Error('郵件服務未配置');
  }

  const config = getMailConfig();
  await getClient().SendEmail({
    FromEmailAddress: config.from,
    Subject: config.subject,
    Destination: [email],
    Template: {
      TemplateID: config.templateId,
      TemplateData: JSON.stringify({
        code,
        purpose: purpose === 'reset' ? '密码重置' : '账号注册',
      }),
    },
    TriggerType: 1,
  });

  return { success: true, message: '验证码邮件发送成功' };
};

// 驗證郵件配置
const validateEmailConfig = () => {
  // 檢查必要的環境變量
  const requiredEnvVars = [
    'TENCENTCLOUD_SECRET_ID',
    'TENCENTCLOUD_SECRET_KEY',
    'TENCENT_SES_FROM_EMAIL',
    'TENCENT_SES_TEMPLATE_ID',
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.log('⚠️ 郵件服務未配置:', missingEnvVars.join(', '));
    return false;
  }

  return true;
};

module.exports = {
  sendVerificationCode,
  validateEmailConfig
};
