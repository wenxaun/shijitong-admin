# 企业级用户与组织架构 - 数据库设计

**版本：** v2.0.0  
**更新时间：** 2026-03-24

---

## 📊 数据库集合设计

### 1. users（用户表）- 升级

```javascript
{
  _id: ObjectId,
  openid: String,              // 微信 OPENID（唯一标识）
  appid: String,               // 小程序 AppID
  
  // 基础信息
  nickname: String,            // 昵称
  avatar_url: String,          // 头像 URL
  phone: String,               // 手机号（新增）
  username: String,            // 用户名（新增，可选）
  password_hash: String,       // 密码哈希（新增，可选）
  
  // 组织信息（新增）
  organization_id: String,     // 所属组织 ID
  organization_name: String,   // 所属组织名称
  department_id: String,       // 所属部门 ID
  department_path: String,     // 部门路径（如：技术部/前端组）
  department_level: Number,    // 部门层级（1/2/3）
  
  // 职位信息（新增）
  position: String,            // 职位（如：前端工程师）
  employee_id: String,         // 工号
  manager_id: String,          // 直属上级 OPENID
  manager_name: String,        // 直属上级姓名
  
  // 权限信息
  role: String,                // 角色：creator/admin/manager/publisher/executor
  permissions: Array,          // 权限列表
  can_manage_team: Boolean,    // 是否可以管理团队
  can_create_task: Boolean,    // 是否可以创建任务
  can_view_all: Boolean,       // 是否可以查看所有任务
  
  // 状态
  status: String,              // active/inactive/disabled
  last_login: Date,
  created_at: Date,
  updated_at: Date
}
```

---

### 2. organizations（组织表）- 新增

```javascript
{
  _id: ObjectId,
  name: String,                // 组织名称（如：XX 科技有限公司）
  short_name: String,          // 简称
  logo_url: String,            // Logo URL
  description: String,         // 描述
  
  // 管理员
  creator_id: String,          // 创建者 OPENID
  creator_name: String,        // 创建者姓名
  admin_ids: Array,            // 管理员 OPENID 列表
  
  // 成员统计
  member_count: Number,        // 成员数量
  department_count: Number,    // 部门数量
  team_count: Number,          // 团队数量
  
  // 状态
  status: String,              // active/disabled
  max_members: Number,         // 最大成员数（可选）
  created_at: Date,
  updated_at: Date
}
```

---

### 3. departments（部门表）- 新增

```javascript
{
  _id: ObjectId,
  organization_id: String,     // 所属组织 ID
  name: String,                // 部门名称（如：技术部）
  short_name: String,          // 简称
  parent_id: String,           // 父部门 ID（空则为一级部门）
  parent_path: String,         // 父路径（如：技术部/前端组）
  level: Number,               // 层级（1/2/3）
  order: Number,               // 排序号
  
  // 负责人
  manager_id: String,          // 部门负责人 OPENID
  manager_name: String,        // 部门负责人姓名
  
  // 成员统计
  member_count: Number,        // 成员数量
  
  // 状态
  status: String,              // active/disabled
  created_at: Date,
  updated_at: Date
}
```

---

### 4. teams（团队表）- 升级

```javascript
{
  _id: ObjectId,
  organization_id: String,     // 所属组织 ID
  name: String,                // 团队名称（如：前端开发团队）
  description: String,         // 团队描述
  
  // 团队类型
  type: String,                // department/project/task_force
  category: String,            // 分类
  
  // 负责人
  leader_id: String,           // 团队负责人 OPENID
  leader_name: String,         // 团队负责人姓名
  
  // 成员
  member_ids: Array,           // 成员 OPENID 列表
  member_count: Number,        // 成员数量
  
  // 权限设置（新增）
  visibility: String,          // public/private/internal
  join_mode: String,           // invite_only/apply/approve
  can_create_task: Array,      // 可以创建任务的成员 OPENID
  can_view_task: Array,        // 可以查看任务的成员 OPENID
  
  // 统计
  task_count: Number,          // 任务总数
  completed_count: Number,     // 已完成任务数
  
  // 状态
  status: String,              // active/disabled
  created_at: Date,
  updated_at: Date
}
```

---

### 5. team_members（团队成员关系表）- 新增

```javascript
{
  _id: ObjectId,
  team_id: String,             // 团队 ID
  user_id: String,             // 用户 OPENID
  user_name: String,           // 用户姓名
  
  // 团队内角色
  role: String,                // leader/member/guest
  title: String,               // 团队内头衔
  
  // 加入信息
  joined_at: Date,
  joined_by: String,           // 邀请人 OPENID
  
  // 状态
  status: String,              // active/pending/left
  left_at: Date,
  left_reason: String
}
```

---

### 6. tasks（任务表）- 升级字段

```javascript
// 新增字段：
organization_id: String,       // 所属组织 ID
department_id: String,         // 所属部门 ID
team_id: String,               // 所属团队 ID
visible_to: Array,             // 可见范围（团队/部门 OPENID 列表）
```

---

## 🔐 权限体系

### 角色定义

| 角色 | 权限 |
|------|------|
| **creator** | 组织创建者，最高权限 |
| **admin** | 组织管理员，管理所有部门/团队 |
| **manager** | 部门经理，管理部门和成员 |
| **publisher** | 发布人，可以创建和分配任务 |
| **executor** | 执行人，只能查看和执行任务 |

### 权限矩阵

| 操作 | creator | admin | manager | publisher | executor |
|------|---------|-------|---------|-----------|----------|
| 创建组织 | ✅ | - | - | - | - |
| 管理部门 | ✅ | ✅ | ✅ | - | - |
| 管理团队 | ✅ | ✅ | ✅ | ✅ | - |
| 创建任务 | ✅ | ✅ | ✅ | ✅ | - |
| 分配任务 | ✅ | ✅ | ✅ | ✅ | - |
| 查看所有任务 | ✅ | ✅ | ✅ | - | - |
| 查看自己任务 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 编辑任务 | ✅ | ✅ | ✅ | ✅ | - |
| 删除任务 | ✅ | ✅ | - | - | - |

---

## 📁 云函数列表

### 用户相关
- `user-login` - 用户登录（已有）
- `user-register` - 用户注册（新增）
- `user-update` - 更新用户信息（新增）
- `user-logout` - 退出登录（新增）

### 组织相关
- `org-create` - 创建组织（新增）
- `org-list` - 获取组织列表（新增）
- `org-detail` - 获取组织详情（新增）
- `org-update` - 更新组织信息（新增）

### 部门相关
- `dept-list` - 获取部门列表（新增）
- `dept-create` - 创建部门（新增）
- `dept-update` - 更新部门（新增）
- `dept-members` - 获取部门成员（新增）

### 团队相关
- `team-list` - 获取团队列表（新增）
- `team-create` - 创建团队（新增）
- `team-update` - 更新团队（新增）
- `team-members` - 获取团队成员（已有）
- `team-invite` - 邀请成员（新增）
- `team-stats` - 团队统计（新增）

---

## 🎯 开发优先级

**第一阶段（P0）：**
1. 用户注册/登录完善
2. 组织创建
3. 部门管理

**第二阶段（P1）：**
4. 团队管理
5. 成员邀请
6. 权限控制

**第三阶段（P2）：**
7. 团队统计
8. 数据可视化

---

_事绩通 v2.0 - 企业级架构_
