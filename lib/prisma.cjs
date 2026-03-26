/**
 * 统一的 Prisma 客户端模块 (CommonJS 版本)
 * 供本地 Express 服务器使用
 * 
 * 使用全局单例模式，避免在开发环境热重载时创建多个连接
 */

// 跳过 TLS 证书验证（Node.js v22+ 对 Neon 数据库连接需要）
// 必须在 PrismaClient 初始化之前设置
// 只在本地开发环境使用，Vercel 生产环境会正确处理 SSL
if (typeof process !== 'undefined' && process.env && !process.env.VERCEL) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { PrismaClient } = require('@prisma/client');

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

module.exports = prisma;
