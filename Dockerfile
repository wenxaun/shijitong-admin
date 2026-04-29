FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY server/package.json ./

RUN npm install

COPY server/ ./

RUN npm install -g typescript @nestjs/cli

RUN npx tsc

RUN node fix-paths.js

# 调试：查看编译后的目录结构
RUN echo "=== Checking dist structure ===" && ls -la dist/ && ls -la dist/src/ 2>/dev/null || echo "dist/src not found" && ls -la dist/server/src/ 2>/dev/null || echo "dist/server/src not found"

EXPOSE 3000

# 尝试正确的路径
CMD ["sh", "-c", "node dist/src/main.js || node dist/server/src/main.js"]
