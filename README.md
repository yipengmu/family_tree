# 🌳 穆氏家谱 - 在线可视化系统

<p align="center">
  <img src="src/res/img/mulogo.png" alt="穆氏家谱" width="120" />
</p>

<p align="center">
  <strong>一个基于 React Flow 构建的现代化家谱可视化系统</strong>
</p>

<p align="center">
  <a href="https://tatababa.top">在线演示</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-功能特性">功能特性</a> •
  <a href="#-api-文档">API 文档</a> •
  <a href="#-部署指南">部署指南</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Express-5.x-green?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-5.x-purple?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/coderabbit/prs/github/yipengmu/family_tree?labelColor=171717&color=FF570A&label=CodeRabbit+Reviews" alt="CodeRabbit Reviews" />
</p>

---

## ✨ 功能特性

- 🌳 **高性能可视化** - 使用 React Flow 处理大型家谱数据（支持 600+ 成员，20+ 代深度）
- 🔍 **智能搜索** - 支持按姓名、职位、地点等多维度搜索
- 📊 **代数筛选** - 可按代数范围筛选显示内容
- 🎨 **交互式界面** - 支持缩放、平移、节点点击查看详情
- 📱 **响应式设计** - 适配桌面端和移动端
- 👥 **多租户支持** - 支持多个家族数据隔离管理
- 🔐 **用户认证** - 完整的注册、登录、邮箱验证功能
- 🤖 **AI OCR** - 集成通义千问，支持家谱图片智能识别
- ☁️ **云端存储** - 支持阿里云 OSS 图片上传

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| **前端框架** | React 18 |
| **可视化引擎** | React Flow 11 |
| **UI 组件库** | Ant Design 5 |
| **布局算法** | Dagre |
| **后端框架** | Express 5 |
| **数据库 ORM** | Prisma 5 |
| **数据库** | PostgreSQL (Neon) |
| **部署平台** | Vercel (Serverless) |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- PostgreSQL 数据库（推荐使用 [Neon](https://neon.tech) 免费 Serverless PostgreSQL）

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/yipengmu/family_tree.git
cd family_tree

# 2. 安装依赖
npm install --legacy-peer-deps

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要配置

# 4. 初始化数据库
npx prisma generate
npx prisma db push

# 5. 启动开发服务器
npm run dev
```

### 访问地址

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:3003
- **健康检查**: http://localhost:3003/health

## 📁 项目结构

```
family_tree/
├── api/                    # Vercel Serverless Functions
│   ├── auth/              # 认证相关 API
│   │   ├── login.js       # 登录
│   │   ├── register.js    # 注册
│   │   ├── send-code.js   # 发送验证码
│   │   └── verify-code.js # 验证码校验
│   ├── family-data/       # 家谱数据 API
│   ├── tenants/           # 租户管理 API
│   └── user/              # 用户信息 API
│
├── server/                 # Express 本地开发服务器
│   ├── app.js             # 服务器入口
│   ├── models/            # 数据模型
│   └── services/          # 业务逻辑服务
│
├── src/                    # React 前端源码
│   ├── components/        # React 组件
│   │   ├── Layout/        # 布局组件
│   │   ├── Pages/         # 页面组件
│   │   ├── UI/            # 通用 UI 组件
│   │   ├── FamilyTreeFlow.js  # 家谱可视化核心
│   │   └── FamilyMemberNode.js # 成员节点组件
│   ├── services/          # 前端服务层
│   ├── utils/             # 工具函数
│   └── data/              # 静态数据
│
├── prisma/                 # Prisma 数据库配置
│   └── schema.prisma      # 数据库模型定义
│
├── scripts/                # 工具脚本
├── tests/                  # 测试文件
├── docs/                   # 项目文档
└── vercel.json            # Vercel 部署配置
```

## 📡 API 文档

### 认证 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/send-code` | 发送邮箱验证码 |
| POST | `/api/auth/verify-code` | 校验验证码 |

### 家谱数据 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/family-data` | 获取家谱数据 |
| POST | `/api/family-data/save` | 保存家谱数据 |
| GET | `/api/family-data/default` | 获取默认家谱 |

### 租户 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/tenants` | 获取租户列表 |
| GET | `/api/tenants/:id` | 获取租户详情 |

### 请求/响应示例

```javascript
// 登录请求
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}

// 登录响应
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "用户名",
    "email": "user@example.com"
  },
  "message": "登录成功"
}
```

## 📊 数据模型

### 家谱成员 (FamilyData)

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | Int | 自增主键 |
| `person_id` | String | 业务唯一标识 |
| `name` | String | 姓名 |
| `g_rank` | Int | 世代数（第1代=1） |
| `rank_index` | Int | 同代排序 |
| `g_father_id` | String | 父亲 ID |
| `sex` | String | 性别 (MAN/WOMAN) |
| `official_position` | String | 职位/官职 |
| `summary` | String | 简介 |
| `birth_date` | String | 出生日期 |
| `location` | String | 籍贯/居住地 |

### JSON 数据格式

```json
{
  "id": 1,
  "name": "穆氏始祖",
  "g_rank": 1,
  "rank_index": 1,
  "g_father_id": 0,
  "sex": "MAN",
  "adoption": "none",
  "official_position": "始祖",
  "summary": "穆氏家族始祖"
}
```

## 🔧 环境变量配置

```bash
# 服务器端口
PORT=3003

# JWT 密钥（生产环境请使用强密钥）
JWT_SECRET=your_secure_jwt_secret

# 数据库连接（PostgreSQL）
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# 前端 API 地址（开发环境）
REACT_APP_API_BASE_URL=http://localhost:3003

# 千问 API（可选，用于 OCR 功能）
REACT_APP_QWEN_API_KEY=your_qwen_api_key

# 阿里云 OSS（可选，用于图片上传）
REACT_APP_OSS_REGION=oss-cn-hangzhou
REACT_APP_OSS_BUCKET=your-bucket-name
REACT_APP_OSS_ACCESS_KEY_ID=your_access_key_id
REACT_APP_OSS_ACCESS_KEY_SECRET=your_access_key_secret

# 多租户配置
REACT_APP_DEFAULT_TENANT_ID=default
REACT_APP_ENABLE_MULTI_TENANT=true
```

## 🌐 部署指南

### Vercel 部署（推荐）

1. Fork 本项目到你的 GitHub
2. 登录 [Vercel](https://vercel.com) 并导入项目
3. 配置环境变量（参考上方环境变量配置）
4. 点击部署

### 环境变量设置

在 Vercel 项目设置中添加以下环境变量：

- `DATABASE_URL` - Neon/PostgreSQL 数据库连接字符串
- `JWT_SECRET` - JWT 签名密钥
- `REACT_APP_QWEN_API_KEY` - （可选）通义千问 API 密钥

### 数据库设置

推荐使用 [Neon](https://neon.tech) 免费 PostgreSQL 数据库：

1. 注册 Neon 账号并创建数据库
2. 获取连接字符串，填入 `DATABASE_URL`
3. 运行 `npx prisma db push` 初始化表结构

## 📝 开发脚本

```bash
# 启动前端开发服务器
npm start

# 启动后端服务器
npm run server

# 同时启动前后端（推荐）
npm run dev

# 构建生产版本
npm run build

# 数据库相关
npm run db:push      # 推送 schema 到数据库
npm run db:migrate   # 运行数据库迁移
npm run db:studio    # 打开 Prisma Studio

# 代码质量
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

- [React Flow](https://reactflow.dev/) - 强大的图形可视化库
- [Ant Design](https://ant.design/) - 优秀的 React UI 组件库
- [Prisma](https://www.prisma.io/) - 现代化数据库 ORM
- [Vercel](https://vercel.com/) - 出色的 Serverless 部署平台
- [Neon](https://neon.tech/) - 免费的 Serverless PostgreSQL

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/yipengmu">yipengmu</a>
</p>
