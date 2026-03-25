// server/services/db.js
// 数据库连接服务，统一使用 Prisma + PostgreSQL
// 导出统一的 Prisma 客户端实例
import prisma from '../../lib/prisma.js';

export default prisma;