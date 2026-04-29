#!/bin/bash

# 后端服务启动脚本

echo "🚀 正在启动后端服务..."

# 进入后端目录
cd server

# 检查是否已编译
if [ ! -d "dist/server/src" ]; then
    echo "📦 首次启动，正在编译..."
    pnpm build
fi

# 启动服务
echo "🌐 后端服务地址: http://localhost:3000"
echo "📊 健康检查: http://localhost:3000/api/health"
echo "📋 配置接口: http://localhost:3000/api/config/current"
echo ""

# 使用开发模式启动（直接运行编译后的文件）
node dist/server/src/main.js > /tmp/server.log 2>&1 &

# 等待服务启动
sleep 2

# 检查服务是否启动成功
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ 后端服务启动成功！"
    echo "📋 进程 ID: $(ps aux | grep 'dist/server/src/main.js' | grep -v grep | awk '{print $2}')"
    echo "📊 日志文件: /tmp/server.log"
    echo ""
    echo "💡 提示：使用 'tail -f /tmp/server.log' 查看实时日志"
else
    echo "❌ 后端服务启动失败！"
    echo "📋 请查看日志: tail -20 /tmp/server.log"
    exit 1
fi
