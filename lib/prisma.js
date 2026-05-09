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
    return `${url}${separator}connect_timeout=30&pool_timeout=30`;
  }
  return url;
}

// 创建 Prisma 客户端实例
// 在开发环境中使用全局缓存，避免热重载时创建多个连接
// 在生产环境中也缓存，避免 serverless 冷启动重复创建连接
const prisma = globalForPrisma.__prisma__ ?? new PrismaClient({
  datasourceUrl: getDatasourceUrl(),
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// 在所有环境中缓存实例到全局对象，避免 serverless 冷启动重复创建连接
if (!globalForPrisma.__prisma__) {
  globalForPrisma.__prisma__ = prisma;
}

/**
 * 确保数据库连接可用（支持 Neon 冷启动重试）
 * @param {number} maxRetries - 最大重试次数，默认 3
 * @param {number} retryDelay - 重试间隔毫秒数，默认 2000
 */
export async function ensureConnection(maxRetries = 3, retryDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      return; // 连接成功
    } catch (error) {
      console.warn(`[prisma] 数据库连接尝试 ${attempt}/${maxRetries} 失败:`, error.message);
      if (attempt === maxRetries) {
        throw error; // 最后一次重试仍失败，抛出错误
      }
      // 等待后重试，指数退避
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
}

export default prisma;
