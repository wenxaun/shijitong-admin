#!/bin/bash

# 腾讯云部署脚本
# 使用方法: ./deploy-tencent-cloud.sh

set -e

# ==================== 加载配置文件 ====================

if [ -f .env.tencent ]; then
    echo "加载配置文件 .env.tencent..."
    source .env.tencent
else
    echo "⚠️  未找到 .env.tencent 配置文件"
    echo "   从 .env.tencent.template 复制并填写配置"
fi

# ==================== 配置区域 ====================

# 腾讯云镜像仓库配置（优先使用环境变量，其次使用配置文件）
REGISTRY="${TENCENT_REGISTRY:-ccr.ccs.tencentyun.com}"
NAMESPACE="${TENCENT_NAMESPACE:-}"  # 请填写你的命名空间
IMAGE_NAME="shijitong-backend"
VERSION="v1.0.0"

# 云开发环境ID
TCB_ENV_ID="${TCB_ENV_ID:-}"  # 请填写你的云开发环境ID

# 后端API地址（管理后台会用到）
BACKEND_URL="${BACKEND_URL:-}"  # 请填写部署后的后端URL

# JWT密钥
JWT_SECRET="${JWT_SECRET:-change-this-to-a-random-secret-key-in-production}"

# ==================== 检查配置 ====================

if [ -z "$NAMESPACE" ]; then
    echo "❌ 错误: 请先配置 NAMESPACE 变量"
    echo "   方式1: 编辑 .env.tencent 文件，填入你的腾讯云命名空间"
    echo "   方式2: 编辑此脚本，填入你的腾讯云命名空间"
    exit 1
fi

if [ -z "$TCB_ENV_ID" ]; then
    echo "❌ 错误: 请先配置 TCB_ENV_ID 变量"
    echo "   方式1: 编辑 .env.tencent 文件，填入你的云开发环境ID"
    echo "   方式2: 编辑此脚本，填入你的云开发环境ID"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" == "change-this-to-a-random-secret-key-in-production" ]; then
    echo "❌ 警告: 请修改 JWT_SECRET 为随机密钥"
    echo "   生成方法: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    exit 1
fi

# ==================== 颜色输出 ====================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}事绩通 - 腾讯云部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# ==================== 步骤1: 检查Docker是否安装 ====================

echo -e "\n${YELLOW}[1/6] 检查Docker环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi
echo -e "${GREEN}✓ Docker已安装${NC}"

# ==================== 步骤2: 检查云开发CLI ====================

echo -e "\n${YELLOW}[2/6] 检查云开发CLI...${NC}"
if ! command -v cloudbase &> /dev/null; then
    echo "正在安装云开发CLI..."
    npm install -g @cloudbase/cli
fi
echo -e "${GREEN}✓ 云开发CLI已安装${NC}"

# ==================== 步骤3: 登录腾讯云镜像仓库 ====================

echo -e "\n${YELLOW}[3/6] 登录腾讯云镜像仓库...${NC}"
echo "请输入腾讯云账号信息:"
docker login $REGISTRY || {
    echo "❌ 登录失败，请检查账号密码"
    exit 1
}
echo -e "${GREEN}✓ 登录成功${NC}"

# ==================== 步骤4: 构建并推送Docker镜像 ====================

echo -e "\n${YELLOW}[4/6] 构建并推送Docker镜像...${NC}"

FULL_IMAGE_NAME="$REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION"

echo "构建镜像: $FULL_IMAGE_NAME"
docker build -f Dockerfile -t $FULL_IMAGE_NAME . || {
    echo "❌ 镜像构建失败"
    exit 1
}

echo "推送镜像..."
docker push $FULL_IMAGE_NAME || {
    echo "❌ 镜像推送失败"
    exit 1
}

echo -e "${GREEN}✓ 镜像构建并推送成功${NC}"

# ==================== 步骤5: 构建管理后台 ====================

echo -e "\n${YELLOW}[5/6] 构建Web UI管理后台...${NC}"

# 进入管理后台目录
cd web-admin || {
    echo "❌ 找不到web-admin目录"
    exit 1
}

# 安装依赖
echo "安装依赖..."
npm install || {
    echo "❌ 依赖安装失败"
    exit 1
}

# 创建生产环境配置文件
cat > .env.production <<EOF
VITE_API_BASE_URL=${BACKEND_URL}
VITE_JWT_SECRET=${JWT_SECRET}
EOF

echo "创建 .env.production 成功"

# 构建项目
echo "构建项目..."
npm run build || {
    echo "❌ 构建失败"
    exit 1
}

echo -e "${GREEN}✓ 管理后台构建成功${NC}"

# ==================== 步骤6: 部署管理后台到静态网站托管 ====================

echo -e "\n${YELLOW}[6/6] 部署管理后台...${NC}"

# 检查是否已登录云开发
if ! cloudbase env:list &> /dev/null; then
    echo "需要登录云开发..."
    cloudbase login || {
        echo "❌ 云开发登录失败"
        exit 1
    }
fi

# 部署dist目录
echo "上传文件到静态网站托管..."
cloudbase hosting:deploy dist -e $TCB_ENV_ID || {
    echo "❌ 部署失败"
    exit 1
}

echo -e "${GREEN}✓ 管理后台部署成功${NC}"

# ==================== 部署完成 ====================

cd ..

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${BLUE}访问信息：${NC}"
echo "后端镜像: $FULL_IMAGE_NAME"
echo "管理后台: https://你的域名 或 云托管提供的默认域名"
echo ""

echo -e "${YELLOW}下一步操作：${NC}"
echo "1. 在腾讯云云托管控制台创建服务"
echo "2. 使用镜像: $FULL_IMAGE_NAME"
echo "3. 配置环境变量："
echo "   - NODE_ENV=production"
echo "   - PORT=80"
echo "   - TCB_ENV_ID=$TCB_ENV_ID"
echo "   - JWT_SECRET=$JWT_SECRET"
echo "   - TENCENTCLOUD_SECRET_ID=你的SecretId"
echo "   - TENCENTCLOUD_SECRET_KEY=你的SecretKey"
echo "4. 在云开发数据库创建管理员账户"
echo "5. 配置自定义域名（可选）"
echo ""

echo -e "${BLUE}文档：${NC}"
echo "- 腾讯云部署指南: tencent-cloud-deployment-guide.md"
echo "- 管理后台部署指南: web-admin-deployment-guide.md"
echo ""
