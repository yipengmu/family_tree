// scripts/test-db-connection.js
// 测试数据库连接脚本
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('正在测试数据库连接...');
    
    // 尝试连接到数据库
    await prisma.$connect();
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    const userCount = await prisma.user.count();
    console.log(`✅ 用户表中找到 ${userCount} 个用户`);
    
    // 尝试查找特定用户
    const user = await prisma.user.findFirst();
    if (user) {
      console.log(`✅ 找到用户: ${user.email}`);
    } else {
      console.log('⚠️ 数据库中没有用户');
    }
    
    console.log('数据库连接测试完成！');
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testConnection();