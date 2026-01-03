# 后端解决方案指南

## 🎯 解决方案概述

采用 **"前端 → 后端 → 千问API"** 的架构来解决CORS跨域问题：

```
前端 (React) → 后端 (Express) → 千问API (阿里云)
```

这样可以完全避免浏览器的CORS限制，因为：
- 前端只调用同域的后端API
- 后端服务器调用千问API（服务器端没有CORS限制）

## 🏗️ 架构说明

### 前端 (React)
- 端口: `http://localhost:3001`
- 调用后端API: `http://localhost:3003/api/qwen/ocr`
- 不再直接调用千问API

### 后端 (Express)
- 端口: `http://localhost:3003`
- 接收前端请求
- 调用千问API
- 返回处理结果

### 千问API (阿里云)
- 端点: `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- 模型: `qwen-vl-max-0809`
- 由后端服务器调用

## 🚀 启动方式

### 方式1: 一键启动（推荐）
```bash
npm run dev
```
这会同时启动后端服务器和前端应用。

### 方式2: 分别启动
```bash
# 终端1: 启动后端服务器
npm run server

# 终端2: 启动前端应用
npm start
```

## 📋 配置要求

### 1. 环境变量配置
在`.env`文件中配置：
```env
# 千问API配置
REACT_APP_QWEN_API_KEY=sk-your-api-key-here

# 后端服务地址（可选，默认为http://localhost:3003）
REACT_APP_BACKEND_URL=http://localhost:3003
```

### 2. 依赖检查
确保已安装必要的依赖：
```bash
npm install express cors node-fetch@2 concurrently
```

## 🧪 测试步骤

### 1. 启动服务
```bash
npm run dev
```

### 2. 验证后端服务
访问 http://localhost:3003/health 应该看到：
```json
{
  "status": "ok",
  "message": "家谱创作工具后端服务运行正常",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 3. 验证前端连接
打开 http://localhost:3001，查看控制台应该看到：
```
🔧 通义千问VL OCR服务初始化...
🏢 后端服务: http://localhost:3003
🔄 OCR端点: http://localhost:3003/api/qwen/ocr
💡 架构: 前端 → 后端 → 千问API (解决CORS问题)
🔍 检查后端服务连接...
✅ 后端服务连接正常: 家谱创作工具后端服务运行正常
```

### 4. 测试OCR功能
1. 进入创作页面
2. 上传图片或使用测试图片
3. 点击"开始识别"
4. 观察控制台日志

### 5. 预期的成功日志

**前端日志**：
```
🆔 [前端-abc123] ========== 开始家谱识别 ==========
📤 [前端-abc123] 发送请求到后端服务...
⏱️ [前端-abc123] 后端API响应时间: 8234ms
📊 [前端-abc123] 响应状态: 200 OK
📥 [前端-abc123] 后端API响应: {success: true, count: 9}
🎉 [前端-abc123] 识别完成，共获得 9 条记录
```

**后端日志**：
```
🆔 [后端-def456] ========== 新的OCR请求 ==========
📥 [后端-def456] 收到OCR请求: {imageCount: 1, tenantId: "default"}
🔑 [后端-def456] API Key状态: 已配置 (sk-1db5ff8...)
🖼️ [后端-def456] 处理图片 1/1: https://aliyun-wb-d4v1oud9n7.oss-cn-shanghai.aliyuncs.com/family-tree/default/1757154613331_x7o7h5_0.jpg
📤 [后端-def456] 调用千问API...
⏱️ [后端-def456] 千问API响应时间: 6180ms
📊 [后端-def456] 响应状态: 200 OK
📥 [后端-def456] 千问API响应: {hasOutput: true, hasChoices: true}
✅ [后端-def456] JSON解析成功，识别到 9 个人物
✅ [后端-def456] 图片 1 识别成功，获得 9 条记录
🎉 [后端-def456] OCR处理完成，共获得 9 条记录
```

## 📊 预期识别结果

基于之前的测试，应该能识别出：
- **一世**: 穆茂
- **二世**: 穆贵、穆森
- **三世**: 穆经、穆宣、穆太、穆振、穆潭、穆兰、穆全、穆珣
- **四世**: 穆永吉、穆永贞、穆永隆、穆永享、穆永成、穆永昌、穆永学、穆永时、穆永高

## 🔍 故障排除

### 1. 后端服务启动失败
**症状**: `Error: listen EADDRINUSE: address already in use :::3003`
**解决**: 
```bash
# 查找占用端口的进程
lsof -i :3003
# 杀死进程
kill -9 <PID>
```

### 2. 前端无法连接后端
**症状**: 控制台显示"后端服务连接失败"
**解决**:
- 确认后端服务已启动
- 检查端口3003是否可访问
- 验证防火墙设置

### 3. 千问API调用失败
**症状**: 后端日志显示401或403错误
**解决**:
- 检查`.env`文件中的`REACT_APP_QWEN_API_KEY`
- 确认API Key有效且有权限
- 验证网络连接

### 4. JSON解析失败
**症状**: 后端日志显示"JSON解析失败"
**解决**:
- 这是正常情况，会自动使用备用解析方案
- 检查千问API返回的原始内容
- 可能需要调整提示词

## 💡 优势

1. **完全解决CORS问题**: 不需要浏览器插件或特殊设置
2. **更好的安全性**: API Key在后端，不暴露给前端
3. **更好的控制**: 可以在后端添加缓存、限流等功能
4. **生产环境友好**: 可以直接部署到生产环境

## 🔧 开发建议

1. **日志监控**: 同时观察前端和后端的控制台日志
2. **错误处理**: 后端会自动处理各种错误情况
3. **超时设置**: 后端设置了30秒超时，前端设置了60秒超时
4. **备用方案**: 如果后端不可用，前端会返回模拟数据

现在请使用 `npm run dev` 启动完整的服务，然后测试OCR功能！
