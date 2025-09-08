# CORS问题解决方案指南

## 🎯 问题说明

您遇到的CORS错误是因为浏览器的安全策略阻止了从前端直接调用通义千问API：

```
Access to fetch at 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

这是一个常见的跨域问题，需要通过后端代理服务器来解决。

## 🔧 解决方案

我已经创建了一个代理服务器来解决这个问题：

### 1. **代理服务器架构**

```
前端 (localhost:3000) → 代理服务器 (localhost:3001) → 通义千问API
```

- 前端不再直接调用通义千问API
- 通过本地代理服务器转发请求
- 代理服务器处理CORS和API调用

### 2. **文件结构**

```
server/
  └── qwen-proxy.js          # 代理服务器
src/services/
  └── qwenOcrService.js      # 更新为使用代理
scripts/
  └── test-proxy.js          # 代理服务器测试
```

## 🚀 启动步骤

### 方法1: 同时启动前端和代理服务器

```bash
npm run dev
```

这个命令会同时启动：
- 代理服务器 (端口3001)
- React前端 (端口3000)

### 方法2: 分别启动

**终端1 - 启动代理服务器:**
```bash
npm run proxy
```

**终端2 - 启动前端:**
```bash
npm start
```

## 🔍 验证步骤

### 1. 检查代理服务器状态

访问: http://localhost:3001/health

应该看到类似输出：
```json
{
  "status": "ok",
  "service": "通义千问代理服务",
  "config": {
    "hasApiKey": true,
    "endpoint": "https://dashscope.aliyuncs.com/...",
    "model": "qwen-vl-max"
  }
}
```

### 2. 测试代理服务器

```bash
node scripts/test-proxy.js
```

### 3. 在前端测试OCR功能

1. 启动应用后进入CreatorPage
2. 上传图片到OSS
3. 点击"开始识别"
4. 查看浏览器控制台日志

## 📊 预期日志输出

### 代理服务器日志:
```
🚀 通义千问代理服务器启动中...
🔑 API Key状态: 已配置 (sk-1db5f...)
🌐 代理端口: 3001
✅ 通义千问代理服务器已启动
🌐 服务地址: http://localhost:3001
```

### 前端日志:
```
🔍 开始通义千问VL-Max OCR识别，图片数量: 1
📋 图片URLs: ["https://your-oss-url.jpg"]
🌐 使用代理服务器: http://localhost:3001/api/qwen/ocr
📤 通过代理服务器发送请求...
📡 代理服务器响应时间: 2000ms
✅ 通义千问OCR识别完成，共解析到 5 条记录
```

## 🔧 配置说明

### 环境变量 (.env)

```env
# 通义千问配置
REACT_APP_QWEN_API_KEY=sk-1db5ff853f264069b67a7b74761578d2
REACT_APP_QWEN_MODEL=qwen-vl-max
REACT_APP_QWEN_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation

# 代理服务器配置
REACT_APP_PROXY_ENDPOINT=http://localhost:3001/api/qwen/ocr
PROXY_PORT=3001
```

### 代理服务器特性

- ✅ **CORS处理**: 自动处理跨域问题
- ✅ **错误处理**: 详细的错误日志和响应
- ✅ **批量处理**: 支持多张图片同时识别
- ✅ **健康检查**: 提供服务状态检查接口
- ✅ **安全性**: API Key在服务器端处理，不暴露给前端

## 🎯 使用流程

1. **启动服务**: `npm run dev`
2. **上传图片**: 将家谱图片上传到OSS
3. **OCR识别**: 点击"开始识别"按钮
4. **查看结果**: 识别结果自动填充到表格
5. **生成文件**: 点击"生成familyData文件"下载结果

## 🔍 故障排除

### 问题1: 代理服务器启动失败

**可能原因:**
- 端口3001被占用
- 缺少依赖包

**解决方案:**
```bash
# 检查端口占用
lsof -i :3001

# 安装依赖
npm install express cors node-fetch

# 更换端口
export PROXY_PORT=3002
```

### 问题2: API Key无效

**症状:**
```
❌ 通义千问API错误: {"code":"InvalidApiKey","message":"Invalid API-key provided."}
```

**解决方案:**
1. 检查.env文件中的API Key是否正确
2. 确认API Key是否有效期内
3. 验证账户余额是否充足

### 问题3: 图片URL无法访问

**症状:**
```
❌ 处理图片失败: 图片URL无法访问
```

**解决方案:**
1. 确认OSS图片URL可以公开访问
2. 检查图片格式是否支持
3. 验证图片大小是否合适

## 🎉 成功标志

当一切正常工作时，您应该看到：

1. **代理服务器正常启动**
2. **前端成功连接代理服务器**
3. **通义千问API正常响应**
4. **识别结果正确填充到表格**
5. **生成的familyData文件包含真实的家谱数据**

现在CORS问题已经完全解决，您可以正常使用通义千问VL-Max进行家谱识别了！
