#!/usr/bin/env node
/**
 * 修复脚本：修复生产环境手机号登录问题
 * 
 * 用法：
 * 1. 本地测试：node scripts/fix-prod-phone-identity.js
 * 2. 在 Vercel 上运行（通过 API endpoint 或 SSH）
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function getPhoneHash(phone) {
  // 使用与代码中完全相同的逻辑
  const secret = process.env.PHONE_IDENTITY_SECRET || process.env.JWT_SECRET || 'fallback-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(phone)
    .digest('hex');
}

async function fixProductionEnvironment() {
  const phone = '18167120075';
  const email = '2246262252@qq.com';
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`生产环境手机号登录修复脚本`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log(`目标用户: ${email}`);
  console.log(`目标手机号: ${phone}\n`);
  
  try {
    // 1. 查找用户
    console.log('步骤 1: 查找邮箱用户...');
    const user = await prisma.user.findUnique({
      where: { email },
      include: { identities: true },
    });
    
    if (!user) {
      console.error(`❌ 错误: 未找到邮箱用户 ${email}`);
      process.exit(1);
    }
    
    console.log(`✅ 找到用户:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - 用户名: ${user.username}`);
    console.log(`   - 邮箱: ${user.email}`);
    console.log(`   - 当前 Identity 数量: ${user.identities.length}`);
    
    for (const identity of user.identities) {
      console.log(`     * ${identity.provider}: ${identity.masked_value || '(无)'} (verified: ${!!identity.verified_at})`);
    }
    
    // 2. 计算当前环境下的 phone hash
    console.log('\n步骤 2: 计算当前环境的 phone hash...');
    const currentPhoneHash = getPhoneHash(phone);
    console.log(`   Phone Hash (前32位): ${currentPhoneHash.substring(0, 32)}...`);
    
    // 3. 检查是否已存在该 hash 的记录
    console.log('\n步骤 3: 检查 phone hash 是否存在...');
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
        console.log(`✅ 该手机号已正确关联到此用户，无需修复`);
        console.log(`   Identity ID: ${existingIdentity.id}`);
        
        // 清理可能存在的旧 identity
        await cleanupOldIdentities(user.id, existingIdentity.id, phone);
        return;
      } else {
        console.error(`❌ 错误: 该手机号已关联到其他用户 (ID: ${existingIdentity.user_id})`);
        console.error(`   这需要手动处理数据冲突`);
        process.exit(1);
      }
    }
    
    // 4. 创建新的 PHONE identity
    console.log('\n步骤 4: 创建新的 PHONE identity...');
    const newIdentity = await prisma.authIdentity.create({
      data: {
        user_id: user.id,
        provider: 'PHONE',
        identifier_hash: currentPhoneHash,
        masked_value: `${phone.slice(0, 3)}****${phone.slice(-4)}`,
        verified_at: new Date(),
      },
    });
    
    console.log(`✅ 成功创建新 Identity:`);
    console.log(`   - ID: ${newIdentity.id}`);
    console.log(`   - Provider: ${newIdentity.provider}`);
    console.log(`   - Masked Value: ${newIdentity.masked_value}`);
    console.log(`   - Verified At: ${newIdentity.verified_at}`);
    
    // 5. 清理旧的无效 identity
    await cleanupOldIdentities(user.id, newIdentity.id, phone);
    
    // 6. 验证修复结果
    console.log('\n步骤 5: 验证修复结果...');
    const verifyResult = await prisma.authIdentity.findUnique({
      where: {
        provider_identifier_hash: {
          provider: 'PHONE',
          identifier_hash: currentPhoneHash,
        },
      },
      include: { user: true },
    });
    
    if (verifyResult && verifyResult.user.id === user.id) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ 修复成功！`);
      console.log(`${'='.repeat(60)}\n`);
      console.log(`用户现在可以使用以下方式登录:`);
      console.log(`  • 手机号: ${phone} ✅`);
      console.log(`  • 邮箱: ${email} ✅`);
      console.log(`\n修复时间: ${new Date().toISOString()}`);
    } else {
      throw new Error('验证失败：未能找到刚创建的 identity');
    }
    
  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    if (error.code === 'P2002') {
      console.error('   原因: 唯一约束冲突，该手机号已被使用');
    }
    process.exit(1);
  }
}

async function cleanupOldIdentities(userId, keepIdentityId, phone) {
  console.log('\n步骤 6: 清理旧的 PHONE identity 记录...');
  
  const oldIdentities = await prisma.authIdentity.findMany({
    where: {
      user_id: userId,
      provider: 'PHONE',
      id: { not: keepIdentityId },
    },
  });
  
  if (oldIdentities.length === 0) {
    console.log('   无需清理');
    return;
  }
  
  console.log(`   发现 ${oldIdentities.length} 条旧记录:`);
  
  for (const old of oldIdentities) {
    console.log(`   - 删除 ID: ${old.id}, Hash: ${old.identifier_hash.substring(0, 20)}...`);
    await prisma.authIdentity.delete({ where: { id: old.id } });
    console.log('     ✓ 已删除');
  }
  
  console.log('✅ 清理完成');
}

// 执行修复
fixProductionEnvironment()
  .catch(error => {
    console.error('未预期的错误:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
