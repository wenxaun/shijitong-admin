# 腾讯云快速部署指南

## 5分钟快速开始

### 第一步：获取腾讯云账号信息

#### 1.1 获取容器镜像命名空间

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 搜索"容器镜像服务"并进入
3. 点击左侧"命名空间"
4. 创建或复制已有的命名空间名称

#### 1.2 获取云开发环境ID

1. 搜索"云开发"并进入
2. 选择你的环境（或创建新环境）
3. 在"环境设置"中复制"环境ID"

#### 1.3 获取API密钥

1. 搜索"访问密钥"并进入
2. 点击"API密钥管理"
3. 复制"SecretId"和"SecretKey"

#### 1.4 生成JWT密钥

在终端运行：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的随机字符串。

### 第二步：配置部署参数

```bash
# 复制配置模板
cp .env.tencent.template .env.tencent

# 编辑配置文件
nano .env.tencent
```

填写以下必填项：

```bash
# 容器镜像服务命名空间
TENCENT_NAMESPACE="your-namespace"

# 云开发环境ID
TCB_ENV_ID="cloud1-xxxxxxxx"

# API密钥
TENCENTCLOUD_SECRET_ID="AKIDxxxxxxxxxxxxxxxxxxxxxxxx"
TENCENTCLOUD_SECRET_KEY="xxxxxxxxxxxxxxxxxxxxxxxx"

# JWT密钥（使用第一步生成的随机字符串）
JWT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 第三步：执行部署脚本

```bash
# 赋予脚本执行权限
chmod +x deploy-tencent-cloud.sh

# 运行部署脚本
./deploy-tencent-cloud.sh
```

脚本会自动完成：
1. ✓ 检查Docker和云开发CLI环境
2. ✓ 登录腾讯云镜像仓库
3. ✓ 构建后端Docker镜像
4. ✓ 推送镜像到腾讯云
5. ✓ 构建Web UI管理后台
6. ✓ 部署管理后台到静态网站托管

### 第四步：在腾讯云控制台配置后端服务

#### 4.1 创建云托管服务

1. 进入 [云托管控制台](https://console.cloud.tencent.com/tcr)
2. 点击"创建服务"
3. 配置服务：
   - 服务名称：`shijitong-backend`
   - 地域：选择离用户最近的地域（如广州）
   - 网络配置：使用默认配置

#### 4.2 创建服务版本

1. 点击刚创建的服务
2. 点击"新建版本"
3. 配置版本：
   - 版本名称：`v1.0.0`
   - 镜像来源：选择"我的镜像"
   - 镜像：选择刚才推送的镜像
     ```
     ccr.ccs.tencentyun.com/your-namespace/shijitong-backend:v1.0.0
     ```
   - 端口映射：容器端口 `80`
   - 环境变量：
     ```
     NODE_ENV=production
     PORT=80
     TCB_ENV_ID=你的云开发环境ID
     JWT_SECRET=你的JWT密钥
     TENCENTCLOUD_SECRET_ID=你的SecretId
     TENCENTCLOUD_SECRET_KEY=你的SecretKey
     ```
   - 资源规格：1核2G（可根据需求调整）
   - 实例数量：1

4. 点击"提交"并等待部署完成（约2-5分钟）

#### 4.3 获取后端访问地址

1. 在服务详情页，点击"访问设置"
2. 配置访问路径：
   - 访问方式：公网负载均衡
   - 路径：`/`
   - 环境：生产环境
3. 复制访问地址，如：
   ```
   https://service-xxx.gz.tencentcloudapi.com
   ```

#### 4.4 更新管理后台配置

修改 `.env.tencent`：

```bash
# 填入后端访问地址
BACKEND_URL="https://service-xxx.gz.tencentcloudapi.com"
```

重新部署管理后台：

```bash
cd web-admin
npm run build
cloudbase hosting:deploy dist -e 你的云开发环境ID
```

### 第五步：创建管理员账户

#### 5.1 通过云开发控制台创建

1. 进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
2. 点击"数据库"
3. 选择 `users` 集合
4. 点击"添加记录"
5. 输入以下JSON（密码需要加密）：

```json
{
  "_id": "admin_001",
  "name": "超级管理员",
  "username": "admin",
  "password": "$2b$10$encrypted_password_here",
  "role": "admin",
  "user_type": "enterprise",
  "created_at": {
    "$date": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 5.2 生成加密密码

在项目根目录创建临时脚本 `scripts/hash-password.js`：

```javascript
const bcrypt = require('bcrypt');

const password = 'your_admin_password';  // 修改为你的管理员密码
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('Hashed password:', hash);
});
```

运行脚本：

```bash
node scripts/hash-password.js
```

复制输出的加密密码，替换上面JSON中的 `password` 字段。

### 第六步：访问管理后台

1. 访问管理后台：
   - 云托管提供的默认域名
   - 或你配置的自定义域名

2. 使用管理员账户登录：
   - 用户名：`admin`
   - 密码：你设置的明文密码

3. 测试各个功能模块

## 配置自定义域名（可选）

### 7.1 配置后端域名

1. 购买域名（如 `yourdomain.com`）
2. 在云托管服务详情页，点击"访问设置"
3. 点击"自定义域名"
4. 添加域名：`api.yourdomain.com`
5. 配置DNS解析：
   - 类型：CNAME
   - 主机记录：`api`
   - 记录值：云控制台提供的CNAME地址

### 7.2 配置管理后台域名

1. 在云开发控制台，点击"静态网站托管"
2. 点击"域名管理"
3. 添加域名：`admin.yourdomain.com`
4. 配置DNS解析：
   - 类型：CNAME
   - 主机记录：`admin`
   - 记录值：云控制台提供的CNAME地址

5. 更新 `.env.tencent`：

```bash
BACKEND_URL="https://api.yourdomain.com"
ADMIN_URL="https://admin.yourdomain.com"
```

6. 重新部署管理后台

## 常见问题

### Q1: 镜像构建失败？

检查：
1. Docker是否正常安装
2. `server/package.json` 是否存在
3. 依赖是否能正常安装

### Q2: 镜像推送失败？

检查：
1. 是否已登录腾讯云镜像仓库
2. 命名空间是否正确
3. 网络是否正常

### Q3: 管理后台无法访问API？

检查：
1. 后端服务是否正常运行
2. BACKEND_URL是否配置正确
3. CORS配置是否允许管理后台域名访问

### Q4: 登录失败？

检查：
1. 数据库中管理员账户是否创建
2. 密码是否正确（加密后的hash）
3. JWT_SECRET配置是否正确

### Q5: 如何查看日志？

1. 后端日志：云托管控制台 -> 服务详情 -> 日志
2. 前端日志：浏览器控制台

## 成本估算

按小规模使用估算：

| 项目 | 配置 | 月费用 |
|------|------|--------|
| 云托管 | 1核2G | ¥5.76 |
| 静态托管 | 5GB存储 | 免费 |
| 数据库 | 2GB容量 | 免费 |
| 流量 | 5GB/月 | 免费 |
| **总计** | | **约 ¥6/月** |

## 下一步

1. ✅ 部署完成
2. 📊 配置数据监控
3. 🔒 配置安全策略（IP白名单、防火墙）
4. 📧 配置邮件通知（可选）
5. 🔄 配置自动备份

## 获取帮助

- 腾讯云官方文档：https://cloud.tencent.com/document/product
- 云托管文档：https://cloud.tencent.com/document/product/1342
- 云开发文档：https://cloud.tencent.com/document/product/876
- 本项目文档：`tencent-cloud-deployment-guide.md`
