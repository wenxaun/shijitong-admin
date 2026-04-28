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

# 使用开发模式启动（支持热更新）
pnpm dev
