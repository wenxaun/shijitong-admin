FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Build frontend first
COPY web-admin/package.json web-admin/pnpm-lock.yaml* ./frontend/
WORKDIR /app/frontend
RUN npm install -g pnpm && pnpm install --frozen-lockfile || pnpm install
COPY web-admin/ ./
RUN pnpm build

# Move frontend dist to public and cleanup
WORKDIR /app
RUN mkdir -p public && cp -r /app/frontend/dist/* ./public/ && rm -rf /app/frontend

# Setup backend
COPY server/package.json ./
RUN npm install

COPY server/ ./
RUN npm install -g @nestjs/cli
RUN nest build
RUN node fix-paths.js

EXPOSE 3000

CMD ["node", "dist/main.js"]
