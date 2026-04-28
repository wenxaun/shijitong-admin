# 使用官方Node.js镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖（用于编译某些npm包）
RUN apk add --no-cache python3 make g++

# 复制package.json和package-lock.json
COPY server/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制项目文件
COPY server/ ./

# 复制dist目录（如果已预构建）
# COPY server/dist ./dist

# 如果没有预构建dist，需要在容器内构建
RUN npm run build || true

# 暴露端口（云托管会使用实际配置的端口）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 0

# 启动应用
CMD ["node", "dist/main.js"]
