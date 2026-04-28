# Web UI 管理后台部署指南

## 概述

事绩通管理后台是一个独立的Web应用，用于管理系统配置、用户、数据和系统监控。

## 需要准备的部分

### 1. 后端API接口

管理后台需要后端提供以下API接口：

#### 管理员登录
```typescript
POST /api/admin/login
Request:
{
  "username": "admin",
  "password": "password"
}
Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "admin_id",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

#### 用户管理
```typescript
// 获取用户列表
GET /api/admin/users?search=关键词&userType=personal&limit=10&offset=0
Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "list": [...],
    "total": 100
  }
}

// 删除用户
DELETE /api/admin/users/:id
Response:
{
  "code": 200,
  "msg": "success"
}
```

#### 配置管理
```typescript
// 获取当前配置
GET /api/config/current
Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "version": "1.0.0",
    "features": {...},
    "ui": {...},
    "wecom": {...}
  }
}

// 更新配置
POST /api/config/update
Request:
{
  "version": "1.0.0",
  "features": {...},
  "ui": {...},
  "wecom": {...}
}
Response:
{
  "code": 200,
  "msg": "success"
}
```

#### 数据分析
```typescript
// 获取分析数据
GET /api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31
Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskTrend": [...],
    "userActivity": [...],
    "deptDistribution": [...]
  }
}

// 导出数据
GET /api/admin/analytics/export
Response: 文件流
```

#### 系统监控
```typescript
// 系统状态
GET /api/admin/system/status
Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "api": true,
    "database": true,
    "cloudFunction": true,
    "resources": {
      "cpu": 45,
      "memory": 62,
      "storage": 78
    }
  }
}

// 系统日志
GET /api/admin/system/logs?level=info&limit=100
Response:
{
  "code": 200,
  "msg": "success",
  "data": [...]
}
```

### 2. 管理员账户

需要在数据库中创建至少一个管理员账户：

```javascript
// 在 users 集合中创建管理员
{
  "_id": "admin_id",
  "name": "管理员",
  "username": "admin",
  "password": "hashed_password",  // 使用 bcrypt 加密
  "role": "admin",
  "user_type": "enterprise",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 3. JWT配置

确保后端配置了JWT密钥，与管理后台的`VITE_JWT_SECRET`保持一致：

```javascript
// 后端 main.ts
app.use(passport.initialize());
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret-key'
}, async (payload, done) => {
  // 验证逻辑
}));
```

### 4. 跨域配置（CORS）

如果管理后台和后端部署在不同域名，需要在后端配置CORS：

```javascript
// 后端 main.ts
app.enableCors({
  origin: 'https://admin.yourdomain.com',  // 管理后台域名
  credentials: true
});
```

### 5. 数据库权限

确保管理后台使用的数据库账户有足够的权限：

- 读取权限：`users`、`configs`、`tasks`等集合
- 写入权限：`configs`、`users`等集合
- 删除权限：`users`集合（用于删除用户）

## 部署步骤

### 步骤1：安装依赖

```bash
cd web-admin
npm install
```

### 步骤2：配置环境变量

复制并编辑环境变量文件：

```bash
cp .env.development .env.production
```

修改`.env.production`：

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_JWT_SECRET=your-production-jwt-secret
```

### 步骤3：构建项目

```bash
npm run build
```

### 步骤4：部署到Web服务器

将`dist`目录上传到Web服务器（Nginx、Apache等）

#### Nginx配置示例

```nginx
server {
  listen 80;
  server_name admin.yourdomain.com;
  root /var/www/html/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

#### Apache配置示例

```apache
<VirtualHost *:80>
  ServerName admin.yourdomain.com
  DocumentRoot /var/www/html/dist

  <Directory /var/www/html/dist>
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted

    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </Directory>

  ProxyPass /api http://localhost:3000/api
  ProxyPassReverse /api http://localhost:3000/api
</VirtualHost>
```

### 步骤5：配置HTTPS（生产环境必须）

使用Let's Encrypt免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.yourdomain.com
```

### 步骤6：访问管理后台

- 访问：https://admin.yourdomain.com
- 使用管理员账户登录

## 安全建议

1. **启用HTTPS**：生产环境必须使用HTTPS
2. **修改默认密码**：首次登录后立即修改管理员密码
3. **限制访问IP**：只允许特定IP访问管理后台
4. **定期更新**：及时更新依赖包和安全补丁
5. **审计日志**：记录所有管理操作，定期审计
6. **备份配置**：定期备份配置数据

## 常见问题

### 1. 登录失败

检查：
- 管理员账户是否存在
- 密码是否正确
- JWT密钥是否配置正确
- 后端API是否正常

### 2. API请求失败

检查：
- `VITE_API_BASE_URL`配置是否正确
- 后端是否正常启动
- CORS配置是否正确
- 网络是否通畅

### 3. 页面空白

检查：
- 浏览器控制台是否有错误
- 构建是否成功
- Web服务器配置是否正确
- 静态资源是否正常加载

## 开发调试

### 本地开发

```bash
cd web-admin
npm run dev
```

### 连接本地后端

确保`.env.development`配置正确：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_JWT_SECRET=your-jwt-secret-key
```

### 连接远程后端

修改`.env.development`：

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_JWT_SECRET=your-jwt-secret-key
```

## 后续优化

1. **权限细化**：实现角色权限管理（RBAC）
2. **操作日志**：记录所有管理操作
3. **多语言支持**：支持中英文切换
4. **主题定制**：支持自定义主题颜色
5. **图表增强**：集成ECharts或Recharts实现数据可视化
6. **消息通知**：集成WebSocket实现实时通知
