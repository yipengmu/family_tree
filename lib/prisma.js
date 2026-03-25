/**
 * 统一的 Prisma 客户端模块
 * 供本地 Express 服务器和 Vercel serverless 函数共用
 * 
 * 使用全局单例模式，避免在开发环境热重载时创建多个连接
 */

import { PrismaClient } from '@prisma/client';

// 使用 globalThis 确保在所有环境下都能正确缓存实例
const globalForPrisma = globalThis;

// 创建 Prisma 客户端实例
// 在开发环境中使用全局缓存，避免热重载时创建多个连接
// 在生产环境中每次创建新实例（Vercel serverless 会自动管理）
const prisma = globalForPrisma.__prisma__ ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// 在非生产环境中缓存实例到全局对象
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma__ = prisma;
}

export default prisma;
