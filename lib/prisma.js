/**
 * 统一的 Prisma 客户端模块
 * 供本地 Express 服务器和 Vercel serverless 函数共用
 * 
 * 使用全局单例模式，避免在开发环境热重载时创建多个连接
 */

import { PrismaClient } from '@prisma/client';

// 使用 globalThis 确保在所有环境下都能正确缓存实例
const globalForPrisma = globalThis;

// 构建 datasource URL，为 Neon serverless 添加连接参数
function getDatasourceUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  
  // 如果是 Neon 数据库，追加连接超时和 pgbouncer 参数
  if (url.includes('neon.tech')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}connect_timeout=15&pool_timeout=15`;
  }
  return url;
}

// 创建 Prisma 客户端实例
const prisma = globalForPrisma.__prisma__ ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  datasourceUrl: getDatasourceUrl(),
});

// 在所有环境中缓存实例到全局对象，避免 serverless 冷启动重复创建连接
if (!globalForPrisma.__prisma__) {
  globalForPrisma.__prisma__ = prisma;
}

export default prisma;
