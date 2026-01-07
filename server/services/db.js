// server/services/db.js
// 数据库连接服务，用于Vercel + Neon部署
import { PrismaClient } from '@prisma/client';

// 在开发环境中，使用全局变量避免热重载时的重复实例
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;