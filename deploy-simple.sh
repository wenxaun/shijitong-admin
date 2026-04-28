#!/bin/bash

# 云开发极简部署脚本
# 使用方法: ./deploy-simple.sh

set -e

# 配置
CLOUD_ENV_ID="cloud1-3g7j95ax4a0f4a3f"
JWT_SECRET="change-this-to-a-random-secret-key"

echo "=========================================="
echo "事绩通 - 云开发极简部署"
echo "=========================================="
echo ""

# 检查云开发CLI
echo "[1/4] 检查云开发CLI..."
if ! command -v cloudbase &> /dev/null; then
    echo "正在安装云开发CLI..."
    npm install -g @cloudbase/cli
fi
echo "✓ 云开发CLI已安装"

# 登录
echo ""
echo "[2/4] 登录云开发..."
if ! cloudbase env:list &> /dev/null; then
    echo "请扫描二维码登录..."
    cloudbase login
fi
echo "✓ 已登录"

# 部署云函数
echo ""
echo "[3/4] 部署云函数..."

for func in admin-login admin-users admin-config; do
    echo "部署 $func..."
    cd cloudfunctions/$func
    cloudbase functions:deploy $func -e $CLOUD_ENV_ID || echo "⚠️ $func 部署失败，请手动部署"
    cd ../..
done

echo "✓ 云函数部署完成"

# 部署管理后台
echo ""
echo "[4/4] 部署管理后台..."
cd web-admin
npm install
npm run build
cloudbase hosting:deploy dist -e $CLOUD_ENV_ID
cd ..
echo "✓ 管理后台部署完成"

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 在云开发控制台创建管理员账户"
echo "2. 访问管理后台: https://$CLOUD_ENV_ID.tcb.qcloud.la"
echo "3. 使用管理员账户登录"
echo ""
echo "云函数已创建："
echo "- admin-login    (管理员登录)"
echo "- admin-users    (用户管理)"
echo "- admin-config   (配置管理)"
echo ""
