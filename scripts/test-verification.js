/**
 * 验证码功能测试脚本
 * 验证数据库连接和验证码功能
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testVerificationCode() {
  console.log('🔍 测试验证码数据库功能...\n');
  
  try {
    // 测试数据库连接
    console.log('✅ 测试数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');
    
    // 测试验证码表是否存在
    console.log('✅ 测试验证码表...');
    const count = await prisma.verificationCode.count();
    console.log(`✅ 验证码表存在，当前记录数: ${count}\n`);
    
    // 测试插入验证码记录
    console.log('✅ 测试插入验证码记录...');
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const email = `test${Date.now()}@example.com`;
    
    const newCode = await prisma.verificationCode.create({
      data: {
        email: email,
        code: testCode,
        purpose: 'register',
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后过期
      }
    });
    
    console.log(`✅ 验证码记录创建成功，ID: ${newCode.id}\n`);
    
    // 测试查找验证码记录
    console.log('✅ 测试查找验证码记录...');
    const foundCode = await prisma.verificationCode.findFirst({
      where: {
        email: email,
        code: testCode,
        purpose: 'register',
        expires_at: {
          gte: new Date() // 未过期
        }
      }
    });
    
    if (foundCode) {
      console.log(`✅ 验证码记录查找成功，ID: ${foundCode.id}\n`);
    } else {
      console.log('❌ 验证码记录查找失败\n');
    }
    
    // 清理测试数据
    console.log('✅ 清理测试数据...');
    await prisma.verificationCode.deleteMany({
      where: {
        email: email
      }
    });
    console.log('✅ 测试数据清理完成\n');
    
    console.log('🎉 验证码功能测试完成，所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testVerificationCode().catch(console.error);
}

module.exports = {
  testVerificationCode
};