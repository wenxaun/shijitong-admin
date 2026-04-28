# 后端服务使用指南

## 📖 概述

后端服务基于 NestJS 框架，提供配置管理、AI 分析、任务处理等功能。

## 🚀 快速启动

### 方法 1：开发模式（推荐）

```bash
cd server
pnpm dev
```

**特点**：
- 支持热更新（修改代码后自动重新编译）
- 输出详细日志
- 适合开发调试

### 方法 2：生产模式

```bash
cd server

# 先编译
pnpm build

# 启动
pnpm start
```

**特点**：
- 运行编译后的代码
- 性能更好
- 适合生产环境

### 方法 3：直接运行编译后的代码

```bash
cd server

# 先编译
pnpm build

# 运行
node dist/server/src/main.js
```

---

## 🌐 服务地址

- **本地开发**：http://localhost:3000
- **健康检查**：http://localhost:3000/api/health
- **配置接口**：http://localhost:3000/api/config/current

---

## 📚 可用接口

### 配置管理

#### 获取当前配置
```bash
GET /api/config/current
```

#### 获取配置版本
```bash
GET /api/config/version
```

#### 查询配置列表
```bash
GET /api/config/records?category=feature
```

#### 更新配置
```bash
PUT /api/config/records/feature-taskReview
Content-Type: application/json

{
  "value": true,
  "operator": "admin"
}
```

#### 批量更新配置
```bash
POST /api/config/batch-update
Content-Type: application/json

{
  "updates": [
    {
      "key": "feature.taskReview",
      "value": true
    }
  ],
  "operator": "admin"
}
```

#### 查询版本历史
```bash
GET /api/config/versions
```

#### 回滚配置
```bash
POST /api/config/versions/:id/rollback
```

---

### 其他接口

#### 健康检查
```bash
GET /api/health
```

#### AI 对话
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "你好"
}
```

#### 任务分析
```bash
POST /api/analyze-task
Content-Type: application/json

{
  "taskContent": "完成项目报告"
}
```

#### 解析分享内容
```bash
POST /api/parse-share
Content-Type: application/json

{
  "shareId": "xxx"
}
```

#### 生成周报
```bash
POST /api/generate-weekly-report
Content-Type: application/json

{
  "startDate": "2026-04-20",
  "endDate": "2026-04-26"
}
```

---

## 🔧 配置说明

### 环境变量

创建 `.env` 文件（可选）：

```env
# 服务端口
PORT=3000

# 数据库配置（暂未使用）
DATABASE_URL=postgresql://localhost:5432/mini-program

# AI 配置
AI_API_KEY=your_api_key
AI_MODEL=gpt-4

# 企业微信配置
WEWORK_CORP_ID=your_corp_id
WEWORK_AGENT_ID=your_agent_id
WEWORK_CORP_SECRET=your_corp_secret
```

### 默认配置

如果未提供环境变量，服务会使用默认配置：
- 端口：3000
- 环境：dev
- API 超时：30 秒
- 缓存超时：5 分钟

---

## 📋 项目结构

```
server/
├── src/
│   ├── main.ts              # 入口文件
│   ├── app.module.ts        # 应用模块
│   ├── app.controller.ts    # 应用控制器
│   ├── app.service.ts       # 应用服务
│   ├── config.module.ts     # 配置模块
│   ├── config.controller.ts # 配置控制器
│   ├── config.service.ts    # 配置服务
│   ├── ai.service.ts        # AI 服务
│   ├── types/
│   │   └── config.ts        # 配置类型定义
│   └── interceptors/
│       └── http-status.interceptor.ts
├── dist/                    # 编译输出目录
│   └── server/src/          # 编译后的文件
├── node_modules/            # 依赖目录
├── nest-cli.json            # Nest CLI 配置
├── tsconfig.json            # TypeScript 配置
├── package.json             # 依赖配置
└── README.md                # 本文档
```

---

## 🛠️ 开发指南

### 添加新的接口

1. 在 `src/` 目录下创建新的模块、控制器和服务

2. 在 `src/app.module.ts` 中注册新模块：

```typescript
@Module({
  imports: [
    ConfigModule,
    // 新模块
    NewModule,
  ],
})
export class AppModule {}
```

3. 实现控制器和服务：

```typescript
@Controller('api/new')
export class NewController {
  constructor(private readonly newService: NewService) {}

  @Get()
  findAll() {
    return this.newService.findAll();
  }
}
```

### 添加新的配置项

1. 在 `src/types/config.ts` 中添加类型定义

2. 在 `src/config.service.ts` 中添加默认配置

3. 使用接口更新配置

---

## 🐛 常见问题

### Q1: 编译失败怎么办？

**解决方法**：
```bash
# 清理编译缓存
cd server
rm -rf dist/
rm -rf node_modules/.cache

# 重新编译
pnpm build
```

### Q2: 端口被占用怎么办？

**解决方法**：
```bash
# 查找占用端口的进程
lsof -i:3000

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 pnpm dev
```

### Q3: 如何查看详细日志？

**解决方法**：
```bash
# 输出到文件
pnpm dev > server.log 2>&1

# 查看日志
tail -f server.log
```

### Q4: 配置接口返回空怎么办？

**解决方法**：
- 检查服务是否正常启动
- 访问健康检查接口：`GET /api/health`
- 查看服务日志：`tail -f /tmp/server.log`

---

## 📞 技术支持

如有问题，请查看：
- NestJS 文档：https://docs.nestjs.com
- 项目根目录的 README.md
- 提交 Issue

---

## 📄 许可证

MIT
