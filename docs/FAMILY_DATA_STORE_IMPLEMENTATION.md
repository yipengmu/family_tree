# 家谱数据存储系统实现总结

## 🎯 系统架构设计

### 技术选型
- **数据库**: SQLite (开发阶段) → PostgreSQL (生产阶段)
- **后端**: Node.js + Express
- **前端**: React + Ant Design
- **数据持久化**: 基于租户的多租户架构

### 架构优势
✅ **轻量级部署**: SQLite无需额外服务器配置
✅ **多租户支持**: 完整的租户隔离机制
✅ **数据一致性**: 事务支持，确保数据完整性
✅ **易于迁移**: 标准SQL，便于未来迁移到云端
✅ **版本控制**: 内置数据版本管理和回滚功能

## 📊 数据库设计

### 核心表结构

#### 1. 租户表 (tenants)
```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,              -- 租户唯一标识
  name TEXT NOT NULL,               -- 族谱名称
  description TEXT,                 -- 描述信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settings TEXT DEFAULT '{}',       -- JSON格式的配置信息
  status TEXT DEFAULT 'active'      -- 状态：active/deleted
);
```

#### 2. 家谱数据表 (family_data)
```sql
CREATE TABLE family_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,          -- 关联租户
  person_id TEXT NOT NULL,          -- 人员唯一标识
  name TEXT NOT NULL,               -- 姓名
  g_rank INTEGER NOT NULL,          -- 世代
  rank_index INTEGER NOT NULL,      -- 排行
  g_father_id TEXT,                 -- 父亲ID
  g_mother_id TEXT,                 -- 母亲ID
  sex TEXT DEFAULT 'MAN',           -- 性别
  adoption TEXT DEFAULT 'none',     -- 收养状态
  official_position TEXT,           -- 官职
  summary TEXT,                     -- 简介
  birth_date TEXT,                  -- 出生日期
  death_date TEXT,                  -- 去世日期
  spouse TEXT,                      -- 配偶
  location TEXT,                    -- 地址
  formal_name TEXT,                 -- 正式姓名
  id_card TEXT,                     -- 身份证
  face_img TEXT,                    -- 头像
  photos TEXT,                      -- 照片
  household_info TEXT,              -- 户籍信息
  home_page TEXT,                   -- 个人主页
  childrens TEXT,                   -- 子女
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  UNIQUE(tenant_id, person_id)      -- 租户内人员ID唯一
);
```

#### 3. 配置表 (family_config)
```sql
CREATE TABLE family_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  UNIQUE(tenant_id, config_key)
);
```

#### 4. 数据版本表 (data_versions)
```sql
CREATE TABLE data_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  data_snapshot TEXT NOT NULL,      -- JSON格式的数据快照
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);
```

### 索引优化
```sql
CREATE INDEX idx_family_data_tenant ON family_data(tenant_id);
CREATE INDEX idx_family_data_rank ON family_data(tenant_id, g_rank);
CREATE INDEX idx_family_config_tenant ON family_config(tenant_id);
```

## 🔧 后端服务实现

### 1. 数据库连接层 (database.js)
- **单例模式**: 确保全局唯一的数据库连接
- **异步初始化**: 支持Promise的数据库初始化
- **事务支持**: 提供完整的事务管理功能
- **错误处理**: 完善的错误捕获和处理机制

### 2. 家谱数据服务 (familyDataService.js)
**核心功能**:
- `saveFamilyData()`: 保存家谱数据到数据库
- `getFamilyData()`: 获取指定租户的家谱数据
- `getFamilyStats()`: 获取家谱统计信息
- `searchFamilyMembers()`: 搜索家谱成员
- `createDataSnapshot()`: 创建数据版本快照
- `restoreToVersion()`: 恢复到指定版本

**特性**:
- ✅ **事务保护**: 所有写操作都在事务中执行
- ✅ **数据验证**: 完整的数据格式验证
- ✅ **版本管理**: 自动创建数据快照
- ✅ **错误恢复**: 支持数据回滚和恢复

### 3. 租户管理服务 (tenantService.js)
**核心功能**:
- `createOrUpdateTenant()`: 创建或更新租户
- `getTenant()`: 获取租户信息
- `getAllTenants()`: 获取所有租户列表
- `saveTenantConfig()`: 保存租户配置
- `getTenantConfig()`: 获取租户配置
- `getTenantStats()`: 获取租户统计信息

**特性**:
- ✅ **多租户隔离**: 完整的数据隔离机制
- ✅ **配置管理**: 灵活的租户配置系统
- ✅ **软删除**: 支持租户的软删除操作

### 4. API接口设计

#### 家谱数据API
```javascript
POST /api/family-data/save          // 保存家谱数据
GET  /api/family-data/:tenantId     // 获取家谱数据
GET  /api/family-data/:tenantId/stats    // 获取统计信息
GET  /api/family-data/:tenantId/search   // 搜索成员
```

#### 租户管理API
```javascript
GET  /api/tenants                   // 获取所有租户
GET  /api/tenants/:tenantId         // 获取指定租户
POST /api/tenants/:tenantId         // 创建或更新租户
```

## 🎨 前端集成

### 1. 数据存储服务 (familyDataStore.js)
**功能特性**:
- ✅ **统一接口**: 封装所有后端API调用
- ✅ **缓存机制**: 5分钟本地缓存，提升性能
- ✅ **错误处理**: 完善的错误处理和重试机制
- ✅ **离线支持**: 网络错误时使用缓存数据

**核心方法**:
```javascript
// 保存数据
await familyDataStore.saveFamilyData(tenantId, familyData);

// 获取数据
const data = await familyDataStore.getFamilyData(tenantId);

// 获取统计
const stats = await familyDataStore.getFamilyStats(tenantId);

// 搜索成员
const results = await familyDataStore.searchFamilyMembers(tenantId, keyword);
```

### 2. 创作页面集成
**保存功能更新**:
```javascript
const saveToCurrentTenant = async () => {
  // 调用后端API保存数据到数据库
  const response = await fetch('http://localhost:3003/api/family-data/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: currentTenant.id,
      familyData: validRows
    })
  });
  
  const result = await response.json();
  if (result.success) {
    message.success(`${result.message} 到 ${currentTenant.name}`);
  }
};
```

## 🚀 系统特性

### 1. 多租户架构
- **数据隔离**: 每个族谱的数据完全独立
- **权限控制**: 基于租户的访问控制
- **配置独立**: 每个租户可以有独立的配置

### 2. 数据一致性
- **事务保护**: 所有关键操作都在事务中执行
- **原子操作**: 保证数据的完整性
- **错误回滚**: 操作失败时自动回滚

### 3. 版本管理
- **自动快照**: 每次保存时自动创建数据快照
- **版本历史**: 保留完整的数据变更历史
- **一键恢复**: 支持恢复到任意历史版本

### 4. 性能优化
- **索引优化**: 针对查询模式优化的数据库索引
- **缓存机制**: 前端智能缓存，减少网络请求
- **分页支持**: 大数据量的分页处理

### 5. 扩展性设计
- **标准SQL**: 便于迁移到其他数据库
- **模块化**: 清晰的分层架构
- **API标准**: RESTful API设计

## 📊 使用流程

### 1. 数据保存流程
```
用户点击"保存到当前家谱" 
    ↓
前端验证数据格式
    ↓
调用后端API (/api/family-data/save)
    ↓
后端验证租户和数据
    ↓
开始数据库事务
    ↓
清理现有数据 → 插入新数据 → 创建版本快照
    ↓
提交事务
    ↓
返回成功结果
    ↓
前端显示成功消息
```

### 2. 数据获取流程
```
族谱页面加载
    ↓
检查本地缓存
    ↓
缓存有效 → 使用缓存数据
    ↓
缓存无效 → 调用API获取数据
    ↓
更新本地缓存
    ↓
渲染数据到界面
```

## 🔍 验证步骤

### 1. 后端验证
1. **服务启动**: ✅ 后端服务正常启动 (http://localhost:3003)
2. **数据库初始化**: ✅ SQLite数据库和表结构创建成功
3. **默认租户**: ✅ 默认租户创建成功
4. **API可用**: ✅ 所有API端点正常响应

### 2. 前端验证
1. **保存功能**: 点击"保存到当前家谱"应该成功保存数据
2. **数据持久化**: 刷新页面后数据应该保持
3. **租户切换**: 不同租户的数据应该完全隔离
4. **错误处理**: 网络错误时应该有友好的错误提示

### 3. 数据库验证
```bash
# 查看数据库文件
ls -la server/data/family_tree.db

# 连接数据库查看表结构
sqlite3 server/data/family_tree.db ".schema"

# 查看数据
sqlite3 server/data/family_tree.db "SELECT * FROM tenants;"
```

## 🎉 实现完成

通过这套完整的家谱数据存储系统，实现了：

✅ **多租户支持**: 基于租户的完整数据隔离
✅ **数据持久化**: SQLite数据库持久化存储
✅ **版本管理**: 完整的数据版本控制和回滚
✅ **性能优化**: 缓存机制和数据库索引优化
✅ **扩展性**: 标准化设计，便于未来云端迁移
✅ **用户体验**: 无缝的数据保存和加载体验

现在用户可以：
- 在创作页面编辑家谱数据
- 点击"保存到当前家谱"将数据持久化到数据库
- 在族谱页面查看保存的数据
- 在不同租户间切换，数据完全隔离
- 享受快速的数据加载体验（缓存机制）

系统已经具备了企业级的数据管理能力，为未来的云端SaaS版本奠定了坚实的基础！
