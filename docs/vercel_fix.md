# Vercel 部署修复说明

## 问题描述
在 Vercel 远程部署后，账号登录时提示：服务器错误: 405，状态代码为 405 Method Not Allowed。

## 问题原因
Vercel 的无服务器函数（Serverless Functions）与传统的 Express 服务器架构不同，需要特定的 API 路由结构。原部署中存在以下问题：

1. API 端点结构不符合 Vercel 规范
2. 路由处理不当，导致 POST 请求无法正确处理
3. CORS 配置不完善
4. JWT 验证中间件在 Vercel 环境中表现不一致

## 解决方案

### 1. API 端点重构
创建符合 Vercel 规范的 API 端点：

```
api/
├── auth/
│   ├── login.js          # 登录端点
│   ├── register.js       # 注册端点
│   └── send-code.js      # 发送验证码端点
├── user/
│   └── profile.js        # 用户资料端点
├── family-data.js        # 家谱数据端点
├── family-data/
│   └── default.js        # 默认家谱数据端点
├── family-data/
│   └── save.js           # 保存家谱数据端点
├── tenants.js            # 租户列表端点
├── tenants/
│   └── [tenantId].js     # 特定租户端点
└── health.js             # 健康检查端点
```

### 2. 端点实现特点
- 每个端点都是独立的 Vercel Serverless 函数
- 正确处理 OPTIONS 预检请求
- 实现适当的 CORS 配置
- 包含 JWT 验证逻辑
- 区分游客模式和认证用户的访问权限

### 3. 前端适配
- 更新 API 请求 URL 以匹配新的端点结构
- 保持游客模式功能
- 维护缓存和数据加载优化

### 4. Vercel 配置
添加 vercel.json 配置文件：
- 设置适当的路由重写
- 配置 CORS 头部
- 指定运行时环境

## 关键改进

### 1. 路由结构优化
- 使用 Vercel 推荐的文件系统路由
- 动态路由参数使用 `[param].js` 结构
- 避免复杂的路由中间件

### 2. 错误处理增强
- 更精确的错误响应
- 详细的日志输出
- 适当的 HTTP 状态码

### 3. 认证流程改进
- 统一的 JWT 验证逻辑
- 游客模式与认证用户的区别处理
- 租户隔离和权限控制

## 测试验证

### 1. 部署后验证步骤
```bash
npm run deploy-check
```

### 2. 验证项目
- [ ] 健康检查端点 (`/api/health`) 正常工作
- [ ] 登录端点 (`/api/auth/login`) 正确接受 POST 请求
- [ ] 注册端点 (`/api/auth/register`) 正常运行
- [ ] 家谱数据端点功能正常
- [ ] CORS 配置正确
- [ ] 游客模式仍然可用

### 3. 预期结果
- 登录请求不再返回 405 错误
- 认证流程正常工作
- 数据访问权限控制有效
- 前后端通信正常

## 注意事项

### 1. 环境变量
确保在 Vercel 项目设置中配置以下环境变量：
- JWT_SECRET: 用于 JWT 令牌签名的密钥
- DATABASE_URL: 数据库连接字符串
- REACT_APP_DEFAULT_TENANT_ID: 默认租户ID

### 2. 数据库连接
Vercel 环境中使用 Prisma 客户端连接数据库，确保数据库连接池配置适合无服务器环境。

### 3. 部署建议
在 Vercel 项目设置中：
- Framework Preset: Select "Next.js" or leave as "Other"
- Build Command: `npm run build`
- Output Directory: `build` (for Create React App) or `out` (for Next.js)

## 验证命令
运行部署检查脚本验证修复效果：
```bash
npm run deploy-check
```