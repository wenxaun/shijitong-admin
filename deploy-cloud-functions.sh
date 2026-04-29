#!/bin/bash

# 云函数快速部署脚本
# 使用方法：./deploy-cloud-functions.sh

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 需要部署的云函数列表（近期修改过的）
FUNCTIONS=(
  "wecom-sync-org"
  "push-notification"
  "send-wecom-notification"
  "enterprise-info"
  "switch-user-type"
  "task-review"
  "task-transfer"
  "task-update"
  "task-list"
  "user-login"
  "admin-clear-all-data"
  "admin-clear-user-data"
  "admin-delete-user"
)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   云函数快速部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "以下云函数将在微信开发者工具中手动上传部署："
echo ""

# 显示待部署的云函数列表
for i in "${!FUNCTIONS[@]}"; do
  echo -e "${YELLOW}$((i+1)). ${FUNCTIONS[$i]}${NC}"
done

echo ""
echo "========================================"
echo ""
echo -e "${YELLOW}部署步骤：${NC}"
echo ""
echo "1. 打开微信开发者工具"
echo "2. 进入 云开发 → 云函数"
echo "3. 右键点击每个云函数"
echo "4. 选择「上传并部署：云端安装依赖」"
echo ""
echo -e "${GREEN}========================================${NC}"
echo ""
echo "等待所有云函数部署完成..."
echo ""

# 检查云函数目录是否存在
for func in "${FUNCTIONS[@]}"; do
  if [ -d "cloudfunctions/$func" ]; then
    echo -e "${GREEN}✅${NC} $func - 目录存在"
  else
    echo -e "${RED}❌${NC} $func - 目录不存在，请检查"
  fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   检查完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "现在可以在微信开发者工具中上传部署云函数了。"
echo ""
echo -e "${YELLOW}提示：${NC}"
echo "- 首次部署需要「云端安装依赖」，时间较长"
echo "- 建议逐个上传，避免并发冲突"
echo "- 部署完成后测试云函数功能"
echo ""
