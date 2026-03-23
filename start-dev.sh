#!/bin/bash

# 启动家庭树项目开发环境的脚本

echo "🚀 启动家庭树项目开发环境..."

# 首先终止已存在的进程
echo "🧹 清理现有进程..."
pkill -f "node server/app.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

# 等待进程终止
sleep 3

# 启动后端服务器
echo "📡 启动后端服务器 (端口 3003)..."
cd /Users/betahome/dev/family_tree
npm run server > backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端服务器启动
sleep 5

# 检查后端服务器是否启动成功
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ 后端服务器启动成功 (PID: $BACKEND_PID)"
else
    echo "❌ 后端服务器启动失败"
    exit 1
fi

# 启动前端服务器
echo "🎨 启动前端服务器 (端口 3001)..."
PORT=3001 npm start > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "🎉 所有服务已启动!"
echo "🌐 前端: http://localhost:3001"
echo "⚙️  后端: http://localhost:3003"
echo "📖 日志文件: backend.log, frontend.log"
echo "📌 前端将通过代理自动转发API请求到后端服务器"
echo "🔐 现在前后端都使用PostgreSQL数据库，与Vercel环境一致"

# 保持脚本运行
wait $BACKEND_PID $FRONTEND_PID