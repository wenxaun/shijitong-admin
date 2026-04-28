# 云开发极简部署方案

## 核心思路

使用你**已有的云开发环境**，不需要：
- ❌ 不需要容器镜像服务
- ❌ 不需要Docker镜像
- ❌ 不需要云托管
- ❌ 不需要API密钥

只需要：
- ✅ 云函数作为后端API
- ✅ 云开发数据库（已有）
- ✅ 静态网站托管（管理后台）

## 部署步骤

### 第一步：创建管理员云函数

在云开发控制台创建云函数：

#### 1.1 创建 admin-login 云函数

```javascript
// cloudfunctions/admin-login/index.js
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const JWT_SECRET = 'your-jwt-secret-change-in-production'  // 请修改为随机密钥

exports.main = async (event) => {
  const { username, password } = event

  try {
    // 查询管理员
    const { data: users } = await db.collection('users')
      .where({
        username,
        role: 'admin'
      })
      .get()

    if (users.length === 0) {
      return {
        code: 401,
        msg: '用户名或密码错误'
      }
    }

    const admin = users[0]

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return {
        code: 401,
        msg: '用户名或密码错误'
      }
    }

    // 生成JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return {
      code: 200,
      msg: 'success',
      data: {
        token,
        user: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          role: admin.role
        }
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      code: 500,
      msg: '登录失败: ' + error.message
    }
  }
}
```

```json
// cloudfunctions/admin-login/package.json
{
  "name": "admin-login",
  "version": "1.0.0",
  "description": "管理员登录",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3"
  }
}
```

#### 1.2 创建 admin-users 云函数

```javascript
// cloudfunctions/admin-users/index.js
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const JWT_SECRET = 'your-jwt-secret-change-in-production'

// 验证token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

exports.main = async (event, context) => {
  const { action, token, ...params } = event

  // 验证管理员身份
  const decoded = verifyToken(token)
  if (!decoded || decoded.role !== 'admin') {
    return {
      code: 401,
      msg: '未授权'
    }
  }

  try {
    switch (action) {
      case 'list':
        // 获取用户列表
        const { search = '', userType = '', limit = 10, offset = 0 } = params
        let query = db.collection('users')

        if (search) {
          query = query.where({
            name: db.RegExp({
              regexp: search,
              options: 'i'
            })
          })
        }

        if (userType) {
          query = query.where({ user_type: userType })
        }

        const { data: list } = await query
          .orderBy('created_at', 'desc')
          .skip(offset)
          .limit(limit)
          .get()

        // 获取总数
        const { total } = await query.count()

        return {
          code: 200,
          msg: 'success',
          data: { list, total }
        }

      case 'delete':
        // 删除用户
        const deleteResult = await db.collection('users')
          .doc(params.userId)
          .remove()

        return {
          code: 200,
          msg: 'success',
          data: deleteResult
        }

      default:
        return {
          code: 400,
          msg: '未知操作'
        }
    }
  } catch (error) {
    console.error('操作失败:', error)
    return {
      code: 500,
      msg: '操作失败: ' + error.message
    }
  }
}
```

```json
// cloudfunctions/admin-users/package.json
{
  "name": "admin-users",
  "version": "1.0.0",
  "description": "用户管理",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

#### 1.3 创建 admin-config 云函数

```javascript
// cloudfunctions/admin-config/index.js
const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const JWT_SECRET = 'your-jwt-secret-change-in-production'

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

exports.main = async (event, context) => {
  const { action, token, config } = event

  const decoded = verifyToken(token)
  if (!decoded || decoded.role !== 'admin') {
    return {
      code: 401,
      msg: '未授权'
    }
  }

  try {
    switch (action) {
      case 'get':
        // 获取当前配置
        const { data: currentConfig } = await db.collection('configs')
          .orderBy('updated_at', 'desc')
          .limit(1)
          .get()

        return {
          code: 200,
          msg: 'success',
          data: currentConfig[0] || {}
        }

      case 'update':
        // 更新配置
        const updateResult = await db.collection('configs')
          .add({
            ...config,
            updated_at: new Date(),
            updated_by: decoded.username
          })

        return {
          code: 200,
          msg: 'success',
          data: updateResult
        }

      default:
        return {
          code: 400,
          msg: '未知操作'
        }
    }
  } catch (error) {
    console.error('操作失败:', error)
    return {
      code: 500,
      msg: '操作失败: ' + error.message
    }
  }
}
```

```json
// cloudfunctions/admin-config/package.json
{
  "name": "admin-config",
  "version": "1.0.0",
  "description": "配置管理",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### 第二步：部署云函数

在云开发控制台：

1. 点击"云函数"
2. 点击"新建云函数"
3. 分别创建三个云函数：
   - admin-login
   - admin-users
   - admin-config
4. 在线编辑或上传代码
5. 点击"安装依赖"（会自动安装package.json中的依赖）

### 第三步：创建管理员账户

在云开发控制台数据库中创建管理员：

```json
// 在 users 集合中添加记录
{
  "_id": "admin_001",
  "name": "超级管理员",
  "username": "admin",
  "password": "$2b$10$N9qo8uLOickgx2ZMRZoMy.MrqJq8/4eK.5.5.5.5.5.5.5.5.5.5.5.5",
  "role": "admin",
  "user_type": "enterprise",
  "created_at": {
    "$date": "2024-01-01T00:00:00.000Z"
  }
}
```

**注意**：上面的密码是加密后的hash值，对应明文密码是 `admin123`

### 第四步：修改管理后台配置

修改 `web-admin/src/services/api.ts`：

```typescript
// 将baseURL改为云函数HTTP地址
const baseURL = 'https://cloud1-3g7j95ax4a0f4a3f.tcb.qcloud.la'

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== 200) {
      if (res.code === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
      message.error(res.msg || '请求失败');
      return Promise.reject(new Error(res.msg || '请求失败'));
    }
    return res;
  },
  (error) => {
    message.error(error.message || '网络错误');
    return Promise.reject(error);
  }
);
```

### 第五步：修改API调用

修改 `web-admin/src/services/auth.ts`（创建这个文件）：

```typescript
import request from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
}

// 管理员登录
export const adminLogin = async (data: LoginRequest): Promise<LoginResponse> => {
  // 直接调用云函数
  const response = await request({
    url: 'https://cloud1-3g7j95ax4a0f4a3f.tcb.qcloud.la/admin-login',
    method: 'POST',
    data,
  });

  return response.data;
};
```

修改 `web-admin/src/pages/Login/index.tsx` 的登录逻辑：

```typescript
import { adminLogin } from '../../services/auth';

const handleLogin = async () => {
  try {
    const res = await adminLogin({ username, password });

    localStorage.setItem('admin_token', res.token);
    localStorage.setItem('admin_user', JSON.stringify(res.user));
    message.success('登录成功');
    navigate('/dashboard');
  } catch (error: any) {
    message.error(error.message || '登录失败');
  }
};
```

### 第六步：部署管理后台

在项目根目录运行：

```bash
cd web-admin
npm install
npm run build
```

然后在云开发控制台：

1. 点击"静态网站托管"
2. 点击"文件管理"
3. 点击"上传文件夹"
4. 选择 `web-admin/dist` 目录
5. 等待上传完成

### 第七步：访问管理后台

1. 在云开发控制台"静态网站托管"页面，点击"访问地址"
2. 使用管理员账户登录：
   - 用户名：`admin`
   - 密码：`admin123`

## 完成！

现在你已经有了一个完整的管理后台，使用的是：
- ✅ 云开发云函数作为后端
- ✅ 云开发数据库
- ✅ 云开发静态网站托管

**不需要任何额外的腾讯云服务配置！**

## 优势

- **简单**：不需要配置Docker、镜像仓库、云托管
- **免费**：云函数有免费额度，足够小规模使用
- **快速**：几分钟即可完成部署
- **省钱**：几乎零成本（在免费额度内）

## 注意事项

1. **修改JWT密钥**：将云函数中的 `JWT_SECRET` 改为随机字符串
2. **修改管理员密码**：使用bcrypt加密你的密码
3. **HTTPS自动配置**：云开发自动提供HTTPS，无需手动配置
4. **域名可选**：可以配置自定义域名，也可以使用云开发提供的默认域名

## 下一步优化

1. 创建更多云函数（数据分析、系统监控等）
2. 配置自定义域名
3. 添加操作日志记录
4. 实现更细粒度的权限控制

需要我帮你创建这些云函数的完整代码吗？
