/**
 * 临时修复接口：修复生产环境手机号登录问题
 * 
 * 使用方式（部署后）:
 * POST /api/admin?type=fix-phone-identity
 * Body: { "phone": "18167120075", "email": "2246262252@qq.com" }
 * 
 * ⚠️ 修复完成后请删除此文件！
 */

import prisma from '../../prisma.js';
import crypto from 'crypto';

function getPhoneHash(phone) {
  const secret = process.env.PHONE_IDENTITY_SECRET || process.env.JWT_SECRET || 'fallback-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(phone)
    .digest('hex');
}

export default async function handler(req, res) {
  // 只允许 POST 方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, email } = req.body;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: phone 和 email',
      });
    }

    console.log(`[FixPhoneIdentity] 开始修复 - Email: ${email}, Phone: ${phone}`);

    // 1. 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      include: { identities: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `未找到邮箱用户: ${email}`,
      });
    }

    // 2. 计算 phone hash
    const currentPhoneHash = getPhoneHash(phone);

    // 3. 检查是否已存在
    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_identifier_hash: {
          provider: 'PHONE',
          identifier_hash: currentPhoneHash,
        },
      },
    });

    if (existingIdentity) {
      if (existingIdentity.user_id === user.id) {
        // 已存在且正确关联，清理旧记录
        await cleanupOldIdentities(user.id, existingIdentity.id);
        
        return res.json({
          success: true,
          message: '手机号已正确关联，无需修复',
          data: {
            userId: user.id,
            phoneIdentityId: existingIdentity.id,
            cleanedUp: true,
          },
        });
      } else {
        return res.status(409).json({
          success: false,
          error: `该手机号已关联到其他用户 (ID: ${existingIdentity.user_id})`,
        });
      }
    }

    // 4. 创建新的 PHONE identity
    const newIdentity = await prisma.authIdentity.create({
      data: {
        user_id: user.id,
        provider: 'PHONE',
        identifier_hash: currentPhoneHash,
        masked_value: `${phone.slice(0, 3)}****${phone.slice(-4)}`,
        verified_at: new Date(),
      },
    });

    // 5. 清理旧的无效 identity
    await cleanupOldIdentities(user.id, newIdentity.id);

    console.log(`[FixPhoneIdentity] 修复成功 - User ID: ${user.id}, Identity ID: ${newIdentity.id}`);

    return res.json({
      success: true,
      message: '修复成功，用户现在可以使用手机号登录',
      data: {
        userId: user.id,
        newIdentityId: newIdentity.id,
        phoneMasked: newIdentity.masked_value,
        fixedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
      },
    });

  } catch (error) {
    console.error('[FixPhoneIdentity] 修复失败:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误',
      code: error.code,
    });
  }
}

async function cleanupOldIdentities(userId, keepIdentityId) {
  const oldIdentities = await prisma.authIdentity.findMany({
    where: {
      user_id: userId,
      provider: 'PHONE',
      id: { not: keepIdentityId },
    },
  });

  for (const old of oldIdentities) {
    console.log(`[Cleanup] 删除旧 identity: ${old.id}`);
    await prisma.authIdentity.delete({ where: { id: old.id } });
  }

  return oldIdentities.length;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
