// scripts/init-db.js
// 初始化数据库脚本，用于创建表结构和迁移现有数据
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createInitialUser() {
  console.log('创建初始用户...');

  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: 'yipengmu@gmail.com' }
    });

    if (existingUser) {
      console.log('用户 yipengmu@gmail.com 已存在，跳过创建');
      return;
    }

    // 创建初始用户，密码为 123456
    const password_hash = await bcrypt.hash('123456', 10);

    const user = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'yipengmu@gmail.com',
        password_hash: password_hash,
        is_active: true,
        wechat_openid: null
      }
    });

    console.log('初始用户创建成功:', user.email);
  } catch (error) {
    console.error('创建初始用户失败:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('开始数据库初始化...');

    // 创建初始用户
    await createInitialUser();

    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行主函数
main();