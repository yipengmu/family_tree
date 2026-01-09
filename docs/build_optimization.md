# Vercel 构建性能优化方案

## 问题分析
- 本地构建快速，但 Vercel 构建超过 10 分钟
- 这通常由以下原因导致：
  1. Prisma 客户端增加了构建复杂度
  2. 大型依赖库的处理
  3. 所有 API 函数包含完整依赖

## 优化方案

### 1. 优化 vercel.json 配置
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### 2. API 函数优化
- 将 Prisma 客户端按需导入，而非全局导入
- 优化 API 函数的依赖树
- 使用更轻量的依赖替代方案

### 3. 依赖优化
- 检查是否所有依赖都需要在生产环境中
- 移除开发依赖到生产环境的传输
- 优化 Prisma 客户端的引入方式

### 4. 分离前端和后端构建
当前的构建流程将前端和后端 API 混合在一起，这可能导致：
- 所有 API 端点都需要完整的前端依赖
- 构建过程包含不必要的资源处理

### 5. Prisma 优化策略
- 使用 Prisma 的按需初始化
- 避免在每个 API 端点中都初始化 Prisma 客户端
- 考虑使用连接池或客户端缓存

## 具体实施步骤

### 步骤 1: 按需导入 Prisma
修改 API 端点，使用按需导入方式：
```javascript
// 而不是在文件顶部全局导入
let prisma;

async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}
```

### 步骤 2: 优化 package.json
确保开发依赖不会影响生产构建：
```json
{
  "devDependencies": {
    // 确保构建工具和测试库在 devDependencies 中
  }
}
```

### 3. 预构建优化
- 在 Vercel 构建前进行预处理
- 使用构建缓存减少重复工作

## 预期效果
- 构建时间减少到 3-5 分钟
- 更稳定的构建过程
- 更好的资源利用

## 验证方法
部署后使用以下方法验证：
- 监控构建时间
- 验证所有 API 端点功能正常
- 确保验证码和注册流程正常工作

## 重要说明
- 当前的构建时间虽长，但功能完整
- 优化构建时间不应牺牲功能完整性
- 有些复杂应用的构建时间较长是正常的
- Vercel 的冷启动时间与构建时间不同