# 阿里云OSS配置指南

本指南将帮助你配置阿里云OSS，实现家谱图片的云端存储。

## 🎯 功能特性

### 使用阿里云OSS SDK的优势
- **直接上传**: 前端直接上传到OSS，无需经过后端服务器
- **高性能**: 利用OSS的全球CDN加速
- **安全可靠**: 支持HTTPS传输和访问控制
- **成本优化**: 按实际使用量付费
- **丰富功能**: 支持图片处理、生命周期管理等

### 已实现的功能
- ✅ 文件上传（支持进度回调）
- ✅ 文件删除（单个和批量）
- ✅ 文件信息获取
- ✅ 临时访问URL生成
- ✅ 租户文件列表查询
- ✅ 自动文件命名和路径管理

## 🚀 快速开始

### 1. 创建阿里云OSS存储桶

1. **登录阿里云控制台**
   - 访问 https://oss.console.aliyun.com/
   - 登录你的阿里云账号

2. **创建存储桶（Bucket）**
   - 点击"创建Bucket"
   - 填写Bucket名称（全局唯一）
   - 选择地域（建议选择离用户最近的地域）
   - 设置存储类型为"标准存储"
   - 设置读写权限为"公共读"（用于图片展示）

3. **配置跨域访问（CORS）**
   ```xml
   <CORSRule>
     <AllowedOrigin>*</AllowedOrigin>
     <AllowedMethod>GET</AllowedMethod>
     <AllowedMethod>POST</AllowedMethod>
     <AllowedMethod>PUT</AllowedMethod>
     <AllowedMethod>DELETE</AllowedMethod>
     <AllowedMethod>HEAD</AllowedMethod>
     <AllowedHeader>*</AllowedHeader>
     <ExposeHeader>ETag</ExposeHeader>
     <ExposeHeader>x-oss-request-id</ExposeHeader>
   </CORSRule>
   ```

### 2. 获取访问密钥

1. **创建AccessKey**
   - 访问 https://ram.console.aliyun.com/users
   - 创建RAM用户或使用现有用户
   - 为用户添加OSS权限策略

2. **推荐权限策略**
   ```json
   {
     "Version": "1",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "oss:PutObject",
           "oss:GetObject",
           "oss:DeleteObject",
           "oss:ListObjects",
           "oss:GetObjectMeta",
           "oss:HeadObject"
         ],
         "Resource": [
           "acs:oss:*:*:your-bucket-name/*"
         ]
       }
     ]
   }
   ```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并填写OSS配置：

```env
# 阿里云OSS配置
REACT_APP_OSS_REGION=oss-cn-hangzhou
REACT_APP_OSS_BUCKET=your-bucket-name
REACT_APP_OSS_ACCESS_KEY_ID=your_access_key_id
REACT_APP_OSS_ACCESS_KEY_SECRET=your_access_key_secret
REACT_APP_OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
```

### 4. 测试配置

启动应用后，在创作页面上传图片测试OSS功能：

```bash
npm start
```

## 📋 配置参数说明

### 必需参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `REACT_APP_OSS_REGION` | OSS区域 | `oss-cn-hangzhou` |
| `REACT_APP_OSS_BUCKET` | 存储桶名称 | `family-tree-storage` |
| `REACT_APP_OSS_ACCESS_KEY_ID` | AccessKey ID | `LTAI5t...` |
| `REACT_APP_OSS_ACCESS_KEY_SECRET` | AccessKey Secret | `2Xh3k...` |

### 可选参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `REACT_APP_OSS_ENDPOINT` | 自定义域名 | 根据region自动生成 |

## 🔧 高级配置

### 1. 自定义域名

如果你有自己的域名，可以配置CNAME：

```env
REACT_APP_OSS_ENDPOINT=https://cdn.yourdomain.com
```

### 2. 图片处理

OSS支持实时图片处理，可以在URL后添加参数：

```javascript
// 生成缩略图
const thumbnailUrl = `${originalUrl}?x-oss-process=image/resize,w_200,h_200`;

// 添加水印
const watermarkUrl = `${originalUrl}?x-oss-process=image/watermark,text_家谱`;
```

### 3. 生命周期管理

在OSS控制台配置生命周期规则，自动删除过期文件：

- 30天后转为低频访问存储
- 90天后转为归档存储
- 365天后删除

## 🛡️ 安全最佳实践

### 1. 权限控制

- 使用RAM用户而非主账号
- 遵循最小权限原则
- 定期轮换AccessKey

### 2. 访问控制

```javascript
// 生成临时访问URL（1小时有效）
const tempUrl = uploadService.generateTempUrl(objectKey, 3600);

// 设置Bucket策略限制访问
```

### 3. 数据安全

- 启用服务端加密
- 配置访问日志
- 设置防盗链

## 📊 监控和优化

### 1. 成本优化

- 使用合适的存储类型
- 配置生命周期规则
- 启用数据压缩

### 2. 性能优化

- 选择合适的地域
- 使用CDN加速
- 启用传输加速

### 3. 监控指标

- 存储用量
- 请求次数
- 流量消耗
- 错误率

## 🔍 故障排除

### 常见问题

1. **跨域错误**
   - 检查CORS配置
   - 确认域名设置正确

2. **权限错误**
   - 检查AccessKey权限
   - 确认Bucket权限设置

3. **上传失败**
   - 检查文件大小限制
   - 确认网络连接
   - 查看控制台错误信息

### 调试方法

```javascript
// 开启调试模式
REACT_APP_DEBUG=true

// 查看详细错误信息
console.log('OSS配置:', uploadService.ossConfig);
console.log('OSS客户端:', uploadService.ossClient);
```

## 📈 使用统计

### 文件组织结构

```
your-bucket/
├── family-tree/
│   ├── default/           # 默认租户
│   │   ├── 20240101_abc123_0.jpg
│   │   └── 20240101_def456_1.png
│   ├── tenant_xyz/        # 自定义租户
│   │   ├── 20240102_ghi789_0.jpg
│   │   └── 20240102_jkl012_1.png
│   └── ...
```

### API使用示例

```javascript
// 上传文件
const urls = await uploadService.uploadFiles(files, tenantId);

// 删除文件
await uploadService.deleteOSSFile(objectKey);

// 获取文件列表
const files = await uploadService.listTenantFiles(tenantId);

// 生成临时URL
const tempUrl = uploadService.generateTempUrl(objectKey, 3600);
```

---

## 📞 技术支持

如果遇到问题，可以：

1. 查看阿里云OSS官方文档
2. 检查控制台错误日志
3. 联系技术支持团队

更多信息请参考：
- [阿里云OSS官方文档](https://help.aliyun.com/product/31815.html)
- [OSS Node.js SDK文档](https://help.aliyun.com/zh/oss/developer-reference/getting-started-with-oss-sdk-for-node-js)
