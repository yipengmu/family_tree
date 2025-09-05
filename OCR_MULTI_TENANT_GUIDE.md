# OCR解析和多租户家谱数据功能指南

本文档介绍了新实现的OCR解析和多租户家谱数据功能的使用方法和配置说明。

## 🎯 功能概述

### 1. OCR解析功能
- **火山引擎OCR集成**: 支持识别家谱图片中的文字信息
- **智能数据解析**: 自动将识别结果转换为标准家谱数据格式
- **开发模式支持**: 在没有配置真实API密钥时使用模拟数据
- **进度显示**: 实时显示OCR识别进度

### 2. 多租户数据管理
- **租户隔离**: 每个租户的家谱数据完全独立
- **动态切换**: 支持在不同家谱之间快速切换
- **数据持久化**: 支持本地存储和服务器存储
- **权限管理**: 支持租户级别的权限控制

### 3. 文件上传服务
- **多种上传方式**: 支持OSS和本地服务器上传
- **文件验证**: 自动验证文件类型和大小
- **进度跟踪**: 实时显示上传进度
- **错误处理**: 完善的错误处理和重试机制

## 🚀 快速开始

### 1. 环境配置

复制 `.env.example` 到 `.env` 并根据需要配置：

```bash
cp .env.example .env
```

#### 开发环境配置
```env
# 开发环境 - 使用模拟数据
REACT_APP_ENV=development
REACT_APP_ENABLE_MULTI_TENANT=true
REACT_APP_DEFAULT_TENANT_ID=default
```

#### 生产环境配置
```env
# 生产环境 - 使用真实API
REACT_APP_ENV=production
REACT_APP_API_BASE_URL=https://your-api-server.com
REACT_APP_VOLC_ACCESS_KEY_ID=your_volc_key
REACT_APP_VOLC_SECRET_ACCESS_KEY=your_volc_secret
REACT_APP_OSS_BUCKET=your-oss-bucket
```

### 2. 启动应用

```bash
npm start
```

## 📖 使用指南

### 创作模块使用流程

1. **选择租户**
   - 在页面右上角选择或创建家谱
   - 每个家谱的数据完全独立

2. **上传图片**
   - 支持最多10张图片
   - 支持 JPG、PNG、GIF、WebP 格式
   - 单个文件最大10MB

3. **OCR识别**
   - 点击"开始识别"按钮
   - 系统自动识别图片中的家谱信息
   - 可以查看识别进度

4. **数据校对**
   - 在表格中校对和编辑识别结果
   - 可以手动添加或删除记录
   - 支持导出Excel格式

5. **保存发布**
   - 保存到当前家谱
   - 下载JSON文件
   - 一键生成网站（开发中）

### 多租户管理

#### 创建新家谱
1. 点击租户选择器中的"创建新家谱"
2. 填写家谱名称和描述
3. 配置权限设置
4. 点击确认创建

#### 切换家谱
1. 在租户选择器中选择目标家谱
2. 系统自动加载对应的数据
3. 所有操作都在当前家谱范围内

#### 删除家谱
1. 在租户选择器中找到要删除的家谱
2. 点击删除图标
3. 确认删除操作

## 🔧 技术架构

### 服务层架构

```
src/services/
├── ocrService.js          # OCR识别服务
├── uploadService.js       # 文件上传服务
├── tenantService.js       # 租户管理服务
└── familyDataService.js   # 家谱数据服务 (已更新)
```

### 组件架构

```
src/components/
├── TenantSelector.js      # 租户选择器组件
└── Pages/
    └── CreatorPage.js     # 创作页面 (已优化)
```

### 数据流

```
用户操作 → 组件状态 → 服务层 → 数据存储
                ↓
            租户隔离 → 缓存管理 → 持久化
```

## 🛠️ API集成

### 火山引擎OCR API

```javascript
// 配置示例
const ocrConfig = {
  accessKeyId: 'your_access_key',
  secretAccessKey: 'your_secret_key',
  region: 'cn-north-1',
  endpoint: 'https://visual.volcengineapi.com'
};

// 调用示例
const result = await ocrService.recognizeFamilyTree(imageUrls, tenantId);
```

### 文件上传API

```javascript
// OSS上传配置
const ossConfig = {
  region: 'oss-cn-hangzhou',
  bucket: 'your-bucket',
  accessKeyId: 'your_key',
  accessKeySecret: 'your_secret'
};

// 上传示例
const urls = await uploadService.uploadFiles(files, tenantId);
```

## 📊 数据格式

### 家谱数据格式

```json
{
  "id": 1,
  "name": "张三",
  "g_rank": 2,
  "rank_index": 1,
  "g_father_id": 1,
  "official_position": "知县",
  "summary": "为官清廉，深受百姓爱戴",
  "sex": "MAN",
  "tenant_id": "tenant_123",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 租户数据格式

```json
{
  "id": "tenant_123",
  "name": "张氏家谱",
  "description": "张氏家族世代传承",
  "isDefault": false,
  "settings": {
    "nameProtection": true,
    "publicAccess": false
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## 🔍 故障排除

### 常见问题

1. **OCR识别失败**
   - 检查网络连接
   - 验证API密钥配置
   - 确认图片格式和大小

2. **文件上传失败**
   - 检查文件大小限制
   - 验证OSS配置
   - 确认网络状态

3. **租户切换异常**
   - 清除浏览器缓存
   - 检查本地存储
   - 重新加载页面

### 调试模式

开启调试模式查看详细日志：

```env
REACT_APP_DEBUG=true
```

## 🚀 部署建议

### 开发环境
- 使用模拟数据进行开发
- 启用调试模式
- 使用本地文件上传

### 生产环境
- 配置真实的API密钥
- 使用OSS文件存储
- 启用数据缓存
- 配置错误监控

## 📈 性能优化

1. **缓存策略**
   - 租户数据缓存1小时
   - 家谱数据缓存24小时
   - 统计数据缓存12小时

2. **懒加载**
   - 按需加载租户数据
   - 图片预览懒加载
   - 组件按需渲染

3. **错误处理**
   - 网络请求重试
   - 降级到本地数据
   - 用户友好的错误提示

## 🔮 未来规划

- [ ] 支持更多OCR服务商
- [ ] 增加批量导入功能
- [ ] 实现实时协作编辑
- [ ] 添加数据导出格式
- [ ] 集成AI智能分析
- [ ] 支持移动端拍照识别

---

如有问题或建议，请查看项目文档或联系开发团队。
