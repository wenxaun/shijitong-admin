FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Build frontend first
COPY web-admin/package.json web-admin/pnpm-lock.yaml* ./frontend/
WORKDIR /app/frontend
RUN npm install -g pnpm && pnpm install --frozen-lockfile || pnpm install
COPY web-admin/ ./
RUN pnpm build
WORKDIR /app

# Setup backend
COPY server/package.json ./
RUN npm install

COPY server/ ./
RUN npm install -g typescript @nestjs/cli
RUN npx tsc
RUN node fix-paths.js

# Copy frontend build to public
RUN cp -r /app/frontend/dist/* ./public/

EXPOSE 3000

CMD ["node", "dist/main.js"]
