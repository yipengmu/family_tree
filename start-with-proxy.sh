#!/bin/bash

# 启动家谱OCR系统（包含代理服务器）

echo "🚀 启动家谱OCR系统..."
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到npm，请先安装npm"
    exit 1
fi

# 检查依赖
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
fi

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "❌ 未找到.env文件，请先配置环境变量"
    exit 1
fi

# 检查API Key
if ! grep -q "REACT_APP_QWEN_API_KEY=sk-" .env; then
    echo "⚠️ 请检查.env文件中的通义千问API Key配置"
fi

echo "✅ 环境检查完成"
echo ""

# 启动服务
echo "🌐 启动代理服务器和前端应用..."
echo "📡 代理服务器: http://localhost:3001"
echo "🖥️ 前端应用: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 使用npm run dev同时启动代理服务器和前端
npm run dev
