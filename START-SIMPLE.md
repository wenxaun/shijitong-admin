# 云开发极简部署方案 - 快速开始

## 3步快速部署

### 步骤1：生成管理员密码

```bash
node scripts/hash-password.js admin123
```

复制输出的加密密码。

### 步骤2：在云开发控制台创建云函数

访问云开发控制台，创建三个云函数：

1. **admin-login** - 管理员登录
   - 复制 `cloudfunctions/admin-login/` 目录中的代码
   - 点击"安装依赖"

2. **admin-users** - 用户管理
   - 复制 `cloudfunctions/admin-users/` 目录中的代码
   - 点击"安装依赖"

3. **admin-config** - 配置管理
   - 复制 `cloudfunctions/admin-config/` 目录中的代码
   - 点击"安装依赖"

### 步骤3：创建管理员账户

在云开发控制台数据库中，添加管理员记录：

```json
{
  "_id": "admin_001",
  "name": "超级管理员",
  "username": "admin",
  "password": "步骤1生成的加密密码",
  "role": "admin",
  "user_type": "enterprise",
  "created_at": {
    "$date": "2024-01-01T00:00:00.000Z"
  }
}
```

### 步骤4：部署管理后台

```bash
cd web-admin
npm install
npm run build
```

在云开发控制台静态网站托管，上传 `web-admin/dist` 目录。

### 步骤5：访问管理后台

访问：https://cloud1-3g7j95ax4a0f4a3f.tcb.qcloud.la

使用管理员账户登录：
- 用户名：`admin`
- 密码：你设置的密码（如 `admin123`）

## 完成！

✅ 云函数已创建：admin-login、admin-users、admin-config
✅ 管理员账户已创建
✅ 管理后台已部署
✅ 可以访问管理后台了！

## 注意事项

1. 修改云函数中的 `JWT_SECRET` 为随机字符串
2. 使用强密码作为管理员密码
3. 云开发会自动配置HTTPS，无需手动操作

详细文档请查看：`SIMPLE-DEPLOY.md`
