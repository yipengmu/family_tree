import { ses } from 'tencentcloud-sdk-nodejs-ses';

const globalForTencentMail = globalThis;

function getConfig() {
  return {
    secretId: process.env.TENCENTCLOUD_SECRET_ID,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
    region: process.env.TENCENT_SES_REGION || 'ap-guangzhou',
    from: process.env.TENCENT_SES_FROM_EMAIL,
    templateId: Number(process.env.TENCENT_SES_TEMPLATE_ID),
    subject: process.env.TENCENT_SES_SUBJECT || '家谱创作工具验证码',
    invitationTemplateId: Number(process.env.TENCENT_SES_INVITATION_TEMPLATE_ID),
    invitationSubject: process.env.TENCENT_SES_INVITATION_SUBJECT || '邀请你一起续写家谱',
  };
}

export function isInvitationMailConfigured() {
  const config = getConfig();
  return isTencentMailConfigured() && Number.isInteger(config.invitationTemplateId) && config.invitationTemplateId > 0;
}

export function isTencentMailConfigured() {
  const config = getConfig();
  return Boolean(
    config.secretId &&
      config.secretKey &&
      config.from &&
      Number.isInteger(config.templateId) &&
      config.templateId > 0
  );
}

function getClient() {
  if (!isTencentMailConfigured()) {
    throw new Error('腾讯云邮件服务未配置');
  }

  if (!globalForTencentMail.__tencentSesClient) {
    const config = getConfig();
    globalForTencentMail.__tencentSesClient = new ses.v20201002.Client({
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

  return globalForTencentMail.__tencentSesClient;
}

export async function sendVerificationEmail({ to, code, purpose = 'register' }) {
  const config = getConfig();
  const purposeText = purpose === 'reset' ? '密码重置' : '账号注册';

  return getClient().SendEmail({
    FromEmailAddress: config.from,
    Subject: config.subject,
    Destination: [to],
    Template: {
      TemplateID: config.templateId,
      TemplateData: JSON.stringify({ code, purpose: purposeText }),
    },
    TriggerType: 1,
  });
}

export async function sendInvitationEmail({ to, familyName, inviterName, inviteUrl, expiresAt }) {
  const config = getConfig();
  if (!isInvitationMailConfigured()) throw new Error('腾讯云邀请邮件模板未配置');
  return getClient().SendEmail({
    FromEmailAddress: config.from,
    Subject: config.invitationSubject,
    Destination: [to],
    Template: {
      TemplateID: config.invitationTemplateId,
      TemplateData: JSON.stringify({ familyName, inviterName, inviteUrl, expiresAt }),
    },
    TriggerType: 1,
  });
}
