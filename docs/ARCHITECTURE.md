# 家谱系统架构文档

## 0.1版本 - 当前架构（纯前端）

### 目录结构
```
src/
├── components/           # React组件
│   ├── FamilyTreeFlow.js    # 主要家谱可视化组件
│   ├── FamilyTreeFlow.css   # 样式文件
│   ├── FamilyMemberNode.js  # 家族成员节点组件
│   └── FamilyMemberNode.css # 节点样式
├── data/                # 静态数据
│   └── familyData.js       # 家谱数据（JSON格式）
├── services/            # 服务层
│   └── familyDataService.js # 数据服务（缓存管理）
├── utils/               # 工具函数
│   ├── cacheManager.js     # 前端缓存管理
│   ├── familyTreeUtils.js  # 家谱工具函数
│   ├── familyTreeCollapse.js # 智能折叠功能
│   └── searchHistory.js    # 搜索历史管理
├── res/                 # 静态资源
│   └── img/               # 图片资源
├── App.js              # 主应用组件
├── App.css             # 应用样式
├── index.js            # 应用入口
└── index.css           # 全局样式
```

### 核心功能
- ✅ 家谱可视化展示（React Flow）
- ✅ 搜索功能（姓名、职位、地点）
- ✅ 智能折叠（前3代后自动折叠）
- ✅ 搜索历史（IndexedDB持久化）
- ✅ 前端缓存（内存+LocalStorage）
- ✅ 响应式设计（桌面+移动端）
- ✅ 节点详情展示
- ✅ 代数筛选

### 技术栈
- React 18 + React Flow 11
- Ant Design 5 (UI组件)
- Dagre (布局算法)
- IndexedDB (搜索历史)
- LocalStorage (数据缓存)

## 0.2版本 - 规划架构（前后台分离）

### 整体架构
```
family-tree-system/
├── frontend/            # 前端应用（React）
├── backend/             # 后端API（Node.js/Express）
├── admin/               # 管理后台（React Admin）
├── shared/              # 共享代码/类型定义
└── docs/                # 文档
```

### 前端架构（frontend/）
```
src/
├── components/          # 组件库
│   ├── common/             # 通用组件
│   ├── family-tree/        # 家谱相关组件
│   └── user/               # 用户相关组件
├── pages/               # 页面组件
│   ├── Home/              # 首页
│   ├── FamilyTree/        # 家谱页面
│   ├── Search/            # 搜索页面
│   └── Profile/           # 用户资料
├── services/            # API服务
│   ├── api.js             # API客户端
│   ├── familyService.js   # 家谱数据服务
│   └── userService.js     # 用户服务
├── store/               # 状态管理（Redux/Zustand）
├── utils/               # 工具函数
├── hooks/               # 自定义Hooks
└── types/               # TypeScript类型定义
```

### 后端架构（backend/）
```
src/
├── controllers/         # 控制器
│   ├── familyController.js # 家谱数据控制器
│   ├── userController.js   # 用户控制器
│   └── uploadController.js # 文件上传控制器
├── models/              # 数据模型
│   ├── Family.js          # 家谱模型
│   ├── User.js            # 用户模型
│   └── Upload.js          # 上传文件模型
├── services/            # 业务逻辑
│   ├── familyService.js   # 家谱业务逻辑
│   ├── ocrService.js      # OCR识别服务
│   └── imageService.js    # 图片处理服务
├── middleware/          # 中间件
│   ├── auth.js            # 认证中间件
│   ├── upload.js          # 文件上传中间件
│   └── validation.js      # 数据验证中间件
├── routes/              # 路由定义
├── config/              # 配置文件
└── utils/               # 工具函数
```

### 管理后台架构（admin/）
```
src/
├── components/          # 管理组件
│   ├── Dashboard/         # 仪表板
│   ├── FamilyManagement/  # 家谱管理
│   ├── UserManagement/    # 用户管理
│   └── UploadManagement/  # 上传管理
├── pages/               # 页面
├── services/            # API服务
└── utils/               # 工具函数
```

### 新增功能规划
1. **多租户支持**
   - 用户注册/登录
   - 家族数据隔离
   - 权限管理

2. **图片上传与OCR**
   - 支持上传最多50张家谱照片
   - OCR文字识别
   - 数据结构化处理

3. **数据管理**
   - 家谱数据CRUD
   - 数据导入/导出
   - 数据备份/恢复

4. **协作功能**
   - 多用户协作编辑
   - 数据审核流程
   - 变更历史记录

### 数据库设计
```sql
-- 用户表
users (id, username, email, password_hash, created_at, updated_at)

-- 家族表
families (id, name, description, owner_id, created_at, updated_at)

-- 家族成员表
family_members (id, family_id, name, generation, father_id, ...)

-- 上传文件表
uploads (id, family_id, filename, file_path, ocr_result, status, ...)

-- 用户权限表
user_permissions (id, user_id, family_id, permission_level, ...)
```

### 部署架构
- **前端**: Vercel/Netlify
- **后端**: Railway/Heroku/AWS
- **数据库**: PostgreSQL/MongoDB
- **文件存储**: AWS S3/Cloudinary
- **OCR服务**: Google Vision API/Azure Cognitive Services

### 迁移计划
1. **Phase 1**: 后端API开发
2. **Phase 2**: 前端重构（API集成）
3. **Phase 3**: 管理后台开发
4. **Phase 4**: OCR功能集成
5. **Phase 5**: 多租户功能
6. **Phase 6**: 部署与测试
