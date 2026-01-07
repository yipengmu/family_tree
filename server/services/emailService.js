// server/services/emailService.js
// 郵件服務

// 發送驗證碼
const sendVerificationCode = async (email, code, purpose = 'register') => {
  // 檢查是否已配置郵件服務
  if (!validateEmailConfig()) {
    throw new Error('郵件服務未配置');
  }

  // 在實際部署中，這裡應該連接郵件服務發送郵件
  // 例如使用 SendGrid、AWS SES 或其他郵件服務
  console.log(`📧 驗證碼郵件 - 收件人: ${email}, 驗證碼: ${code}, 用途: ${purpose}`);
  
  // 模擬發送郵件
  return { success: true, message: '驗證碼郵件發送成功' };
};

// 驗證郵件配置
const validateEmailConfig = () => {
  // 檢查必要的環境變量
  const requiredEnvVars = [
    'EMAIL_HOST',
    'EMAIL_PORT', 
    'EMAIL_USER',
    'EMAIL_PASS'
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