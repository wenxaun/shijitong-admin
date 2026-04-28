# 腾讯云部署指南

## 概述

本指南详细介绍如何将事绩通项目部署到腾讯云，包括：

- **后端服务**：使用腾讯云云托管部署NestJS后端
- **前端管理后台**：使用腾讯云静态网站托管部署Web UI
- **数据库**：使用云开发数据库
- **小程序**：使用微信云开发

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   微信小程序                          │
│              (微信云开发 - 已有)                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│             云开发数据库 (clouddb)                    │
│            (小程序和Web后台共用)                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│          腾讯云云托管 (后端NestJS)                    │
│          API: /api/admin/*                          │
│          API: /api/config/*                         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│       腾讯云静态网站托管 (Web UI管理后台)             │
│          URL: https://admin.xxx.com                │
└─────────────────────────────────────────────────────┘
```

## 一、准备阶段

### 1.1 注册腾讯云账号

1. 访问 [腾讯云官网](https://cloud.tencent.com/)
2. 注册账号并完成实名认证
3. 开通相关服务

### 1.2 开通所需服务

在腾讯云控制台开通以下服务：

1. **云开发** - 用于数据库（已有）
2. **云托管** - 用于后端服务
3. **静态网站托管** - 用于Web UI管理后台
4. **域名服务** - 可选，用于自定义域名

## 二、部署后端服务（云托管）

### 2.1 创建云托管环境

1. 登录腾讯云控制台
2. 进入 [云托管控制台](https://console.cloud.tencent.com/tcr)
3. 点击"创建服务"
4. 配置服务信息：
   - **服务名称**：shijitong-backend
   - **地域**：选择离用户最近的地域（如广州、上海）
   - **网络配置**：选择或创建私有网络
5. 点击"创建"

### 2.2 准备后端代码

#### 2.2.1 创建Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 使用官方Node.js镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY server/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制项目文件
COPY server/ ./

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "run", "start:prod"]
```

#### 2.2.2 创建.dockerignore

在项目根目录创建 `.dockerignore`：

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
*.md
web-admin
dist
.vscode
.idea
```

#### 2.2.3 修改后端配置

修改 `server/src/main.ts`，确保监听正确的端口：

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 从环境变量获取端口，云托管默认为 80
  const port = process.env.PORT || 3000;
  
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,  // 允许所有来源，生产环境应配置具体域名
    credentials: true,
  });
  
  await app.listen(port);
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
```

#### 2.2.4 更新package.json

确保 `server/package.json` 包含生产启动脚本：

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "start:dev": "nest start --watch"
  }
}
```

### 2.3 构建Docker镜像

#### 2.3.1 登录腾讯云镜像仓库

```bash
# 登录
docker login ccr.ccs.tencentyun.com \
  --username=<你的腾讯云账号> \
  --password=<你的腾讯云密码>
```

#### 2.3.2 构建镜像

```bash
# 进入项目根目录
cd /workspace/projects

# 构建镜像
docker build -f Dockerfile -t ccr.ccs.tencentyun.com/<你的命名空间>/shijitong-backend:v1.0.0 .

# 推送镜像
docker push ccr.ccs.tencentyun.com/<你的命名空间>/shijitong-backend:v1.0.0
```

### 2.4 部署到云托管

1. 在云托管控制台，点击刚创建的服务
2. 点击"新建版本"
3. 配置版本信息：
   - **版本名称**：v1.0.0
   - **镜像**：选择刚推送的镜像
   - **端口映射**：容器端口 80 或 3000
   - **环境变量**：
     ```
     NODE_ENV=production
     PORT=80
     CLOUD_ENV=production
     JWT_SECRET=your-production-jwt-secret
     TENCENTCLOUD_SECRET_ID=your-secret-id
     TENCENTCLOUD_SECRET_KEY=your-secret-key
     TCB_ENV_ID=your-tcb-env-id
     ```
   - **资源规格**：根据需求选择（如 1核2G）
   - **实例数量**：1（可后续扩容）
4. 点击"提交"并等待部署完成

### 2.5 配置访问方式

1. 在服务详情页，点击"访问设置"
2. 配置访问路径：
   - **访问方式**：公网负载均衡
   - **路径**：`/`
   - **环境**：生产环境
3. 获取访问地址，格式如：`https://service-xxx.gz.tencentcloudapi.com`

## 三、部署Web UI管理后台（静态网站托管）

### 3.1 创建静态网站托管空间

1. 进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的云开发环境
3. 点击"静态网站托管"
4. 点击"开通服务"

### 3.2 构建管理后台

```bash
# 进入管理后台目录
cd /workspace/projects/web-admin

# 安装依赖
npm install

# 构建生产版本
npm run build
```

### 3.3 上传文件

#### 方式一：使用云开发命令行工具

```bash
# 安装云开发CLI
npm install -g @cloudbase/cli

# 登录
cloudbase login

# 初始化（如果还没初始化）
cloudbase init

# 上传dist目录
cd /workspace/projects/web-admin
cloudbase hosting:deploy dist -e your-env-id
```

#### 方式二：使用控制台上传

1. 在静态网站托管页面，点击"文件管理"
2. 点击"上传文件夹"
3. 选择 `web-admin/dist` 目录
4. 等待上传完成

### 3.4 配置自定义域名（可选）

1. 在静态网站托管页面，点击"域名管理"
2. 点击"添加域名"
3. 输入你的域名（如 `admin.yourdomain.com`）
4. 按照提示配置DNS解析：
   - 记录类型：CNAME
   - 记录值：云控制台提供的CNAME地址
5. 等待DNS生效（通常几分钟到几小时）

### 3.5 配置重定向规则

在静态网站托管设置中，添加重定向规则以支持React Router：

```
所有请求 -> /index.html
```

或在 `dist` 目录创建 `cloudbaserc.json`：

```json
{
  "hosting": {
    "redirects": [
      {
        "type": "SPA",
        "regex": ".*",
        "to": "/index.html"
      }
    ]
  }
}
```

### 3.6 配置环境变量

在 `web-admin` 目录创建 `.env.production`：

```env
VITE_API_BASE_URL=https://your-backend-url.com
VITE_JWT_SECRET=your-production-jwt-secret
```

重新构建并上传：

```bash
npm run build
cloudbase hosting:deploy dist -e your-env-id
```

## 四、数据库配置

### 4.1 使用云开发数据库（推荐）

小程序和Web后台共用云开发数据库，无需额外配置。

#### 4.1.1 获取数据库连接信息

1. 进入云开发控制台
2. 点击"数据库"
3. 点击"数据库连接"
4. 复制连接字符串

#### 4.1.2 在后端配置连接

在 `server/src/modules/config/config.service.ts` 中配置：

```typescript
@Injectable()
export class ConfigService {
  // 使用云开发SDK连接数据库
  async getDbConnection() {
    const tcb = require('tcb-admin-node');
    tcb.init({
      env: process.env.TCB_ENV_ID,
      secretId: process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
    });
    return tcb.database();
  }
}
```

### 4.2 创建管理员账户

#### 方式一：通过云开发控制台

1. 进入云开发控制台
2. 点击"数据库"
3. 选择 `users` 集合
4. 点击"添加记录"
5. 输入管理员信息：
```json
{
  "_id": "admin_001",
  "name": "超级管理员",
  "username": "admin",
  "password": "$2b$10$encrypted_password",  // 需要bcrypt加密
  "role": "admin",
  "user_type": "enterprise",
  "created_at": {
    "$date": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 方式二：通过API创建

创建一个临时脚本生成加密密码：

```typescript
// scripts/create-admin.ts
import * as bcrypt from 'bcrypt';

const password = 'your_admin_password';
const hashedPassword = await bcrypt.hash(password, 10);
console.log('Hashed password:', hashedPassword);
```

运行脚本并复制输出的加密密码，然后插入数据库。

## 五、域名和SSL证书

### 5.1 配置后端域名（可选）

1. 在云托管服务详情页，点击"访问设置"
2. 点击"自定义域名"
3. 输入域名（如 `api.yourdomain.com`）
4. 配置DNS解析：
   - 记录类型：CNAME
   - 记录值：云托管提供的CNAME地址
5. 等待DNS生效

### 5.2 配置SSL证书

腾讯云云托管和静态网站托管都会自动配置HTTPS证书，无需手动配置。

## 六、测试验证

### 6.1 测试后端API

```bash
# 测试健康检查
curl https://your-backend-url.com/api/health

# 测试管理员登录
curl -X POST https://your-backend-url.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

### 6.2 测试管理后台

1. 访问：`https://admin.yourdomain.com`
2. 使用管理员账户登录
3. 测试各个功能模块

## 七、监控和维护

### 7.1 查看日志

1. 在云托管控制台，选择服务
2. 点击"日志"
3. 选择实例和时间范围查看日志

### 7.2 监控指标

1. 在云托管控制台查看：
   - CPU使用率
   - 内存使用率
   - 请求数
   - 错误率

### 7.3 自动扩缩容

在云托管控制台配置自动扩缩容规则：

- CPU使用率 > 70% 时自动扩容
- CPU使用率 < 30% 时自动缩容

## 八、成本估算

### 8.1 云托管费用

- **实例费用**：按实际使用量计费
  - 1核2G：约 ¥0.008/小时 = ¥5.76/月
  - 2核4G：约 ¥0.016/小时 = ¥11.52/月
- **存储费用**：免费额度 1GB
- **流量费用**：免费额度 5GB/月

### 8.2 静态网站托管费用

- **存储费用**：免费额度 5GB
- **流量费用**：免费额度 5GB/月
- **请求数**：免费额度 100万次/月

### 8.3 数据库费用

- **容量费用**：免费额度 2GB
- **读次数**：免费额度 5万次/天
- **写次数**：免费额度 3万次/天

### 8.4 月度估算（小规模使用）

- 云托管（1核2G）：约 ¥6/月
- 静态托管：免费
- 数据库：免费
- **总计**：约 ¥6/月

## 九、常见问题

### 9.1 后端服务无法启动

检查：
1. Docker镜像是否正确构建
2. 环境变量是否配置正确
3. 数据库连接是否正常
4. 查看云托管日志

### 9.2 管理后台无法访问API

检查：
1. CORS配置是否正确
2. API地址是否正确
3. 后端服务是否正常运行
4. 查看浏览器控制台错误信息

### 9.3 数据库连接失败

检查：
1. TCB_ENV_ID 是否正确
2. SecretId 和 SecretKey 是否正确
3. 网络权限是否允许访问数据库

### 9.4 域名解析不生效

检查：
1. DNS记录是否配置正确
2. 是否已等待足够时间（通常5-10分钟）
3. 使用 `nslookup` 或 `dig` 检查解析

## 十、安全建议

1. **使用HTTPS**：确保所有服务都使用HTTPS
2. **强密码策略**：管理员密码必须复杂且定期更换
3. **限制访问**：配置IP白名单，只允许特定IP访问管理后台
4. **定期备份**：定期备份数据库和配置
5. **监控告警**：配置异常告警，及时发现安全问题
6. **更新依赖**：及时更新依赖包，修复安全漏洞

## 十一、快速部署脚本

创建自动化部署脚本 `deploy-tencent-cloud.sh`：

```bash
#!/bin/bash

# 配置变量
PROJECT_DIR="/workspace/projects"
REGISTRY="ccr.ccs.tencentyun.com"
NAMESPACE="your-namespace"
IMAGE_NAME="shijitong-backend"
VERSION="v1.0.0"
TCB_ENV_ID="your-tcb-env-id"

echo "开始部署到腾讯云..."

# 1. 构建Docker镜像
echo "正在构建Docker镜像..."
docker build -f Dockerfile -t $REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION $PROJECT_DIR

# 2. 推送镜像
echo "正在推送镜像..."
docker push $REGISTRY/$NAMESPACE/$IMAGE_NAME:$VERSION

# 3. 构建管理后台
echo "正在构建管理后台..."
cd $PROJECT_DIR/web-admin
npm install
npm run build

# 4. 部署管理后台
echo "正在部署管理后台..."
cloudbase hosting:deploy dist -e $TCB_ENV_ID

echo "部署完成！"
echo "后端地址: https://your-backend-url.com"
echo "管理后台: https://admin.yourdomain.com"
```

使用方法：

```bash
chmod +x deploy-tencent-cloud.sh
./deploy-tencent-cloud.sh
```

## 总结

通过腾讯云云托管和静态网站托管，你可以轻松部署：

✅ **后端服务**：NestJS API，自动扩缩容
✅ **管理后台**：React + Ant Design，全球CDN加速
✅ **数据库**：云开发数据库，自动备份
✅ **域名**：HTTPS自动配置，安全可靠

**部署优势**：
- 无需管理服务器
- 按需付费，成本可控
- 自动扩缩容
- 高可用性
- 安全防护

开始部署吧！如有问题，请查看腾讯云官方文档或联系技术支持。
