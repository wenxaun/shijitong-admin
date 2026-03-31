# 企业微信接入兼容方案

> 更新时间：2026-03-31
> 目标：保留"我的团队"功能，兼容企业微信组织架构同步

---

## 一、设计原则

### 1.1 双轨并行

```
┌─────────────────────────────────────────────────────────────┐
│                      用户组织关系                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   【我的团队】（手动创建）          【企业微信组织】（自动同步） │
│   ├─ 团队A                        ├─ 部门A                  │
│   ├─ 团队B                        ├─ 部门B                  │
│   └─ 团队C                        └─ 部门C                  │
│                                                             │
│   特点：                          特点：                     │
│   • 用户手动创建/加入              • 从企业微信自动同步       │
│   • 灵活、跨部门协作               • 严格层级关系             │
│   • 适合临时项目组                 • 适合正式组织架构         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据隔离

| 维度 | 我的团队 | 企业微信组织 |
|------|----------|--------------|
| 存储集合 | `teams` + `team_members` | `wecom_departments` + `users` |
| 关系字段 | `team_id` | `department_id` + `manager_id` |
| 创建方式 | 手动创建/邀请码加入 | 企业微信 API 同步 |
| 上级关系 | 团队内无层级 | 严格上下级关系 |

---

## 二、数据层改造

### 2.1 users 集合扩展

```javascript
// 现有字段
{
  _id: String,
  openid: String,
  nickname: String,
  avatar_url: String,
  role: String,  // executor/publisher/admin
  created_at: Date,
  last_login: Date
}

// 新增字段（企业微信相关）
{
  // 企业微信关联
  wecom_userid: String,        // 企业微信成员 UserID
  wecom_corpid: String,        // 所属企业 ID（支持多企业）
  
  // 组织架构
  department_id: String,       // 主部门 ID
  department_name: String,     // 主部门名称
  departments: [String],       // 所属部门列表（支持多部门）
  
  // 上下级关系
  manager_id: String,          // 直属上级 openid
  manager_name: String,        // 直属上级姓名
  direct_leader: String,       // 企业微信直属上级 UserID
  
  // 汇报配置
  report_to: [String],         // 汇报对象 openid 列表
  receive_daily: Boolean,      // 是否接收日报
  receive_weekly: Boolean,     // 是否接收周报
  
  // 同步状态
  wecom_synced_at: Date,       // 最后同步时间
  wecom_sync_status: String    // synced/pending/failed
}
```

### 2.2 新增 wecom_departments 集合

```javascript
{
  _id: String,
  wecom_id: Number,            // 企业微信部门 ID
  wecom_parentid: Number,      // 父部门 ID
  name: String,                // 部门名称
  order: Number,               // 排序
  leader_userid: String,       // 部门负责人 UserID
  
  // 关联数据
  member_count: Number,        // 成员数量
  manager_openid: String,      // 负责人 openid
  
  // 同步信息
  wecom_corpid: String,        // 所属企业 ID
  synced_at: Date              // 同步时间
}
```

### 2.3 新增 wecom_config 集合

```javascript
{
  _id: String,
  corpid: String,              // 企业 ID
  corp_name: String,           // 企业名称
  agentid: Number,             // 应用 ID
  secret_encrypted: String,    // 加密后的 Secret
  access_token: String,        // 缓存的 access_token
  token_expires_at: Date,      // token 过期时间
  
  // 同步配置
  sync_enabled: Boolean,       // 是否启用同步
  sync_cron: String,           // 同步 cron 表达式
  last_sync_at: Date,          // 最后同步时间
  
  // 功能开关
  daily_report_enabled: Boolean,
  daily_report_time: String,   // 例如 "18:00"
  weekly_report_enabled: Boolean
}
```

---

## 三、云函数设计

### 3.1 wecom-sync — 组织架构同步

**功能：**
- 从企业微信 API 同步部门和成员
- 更新 `users` 表的上下级关系
- 支持 multiple corp（多企业）

**入口参数：**
```javascript
{
  corpid?: String,      // 指定企业 ID，不传则同步所有
  mode: "full" | "incremental"
}
```

**核心逻辑：**
```
1. 获取 access_token
2. 获取部门列表 → 更新 wecom_departments
3. 遍历部门获取成员：
   - 匹配已有用户（通过 wecom_userid 或 openid）
   - 更新 manager_id、department_id
   - 设置 report_to（默认直属上级）
4. 记录同步日志
```

### 3.2 daily-report — 日报生成与推送

**企业微信日报功能参考：**
- 时间：每天 18:00（可配置）
- 内容：已完成、进行中、逾期任务
- 推送：本人 + 直属上级

**入口参数：**
```javascript
{
  user_openid?: String,   // 指定用户，不传则全员
  date?: String,          // 指定日期，默认今天
  preview?: Boolean       // 预览模式，不推送
}
```

**日报格式：**
```
📋 张三 · 3月31日日报

✅ 今日完成（2项）
  · 客户回访方案 90分
  · Q2预算表 85分

⏳ 进行中（3项）
  · 品牌合作方案 ⚠️ 明天截止
  · 活动策划案 周五截止
  · 数据分析报告 下周一截止

❌ 逾期（1项）
  · 供应商合同（逾期2天）

📊 本周进度
  完成 8/12 | 均分 82 | 及时率 75%
```

**推送逻辑：**
```
1. 查询当天有任务更新的所有用户
2. 为每个用户生成日报内容
3. 确定推送对象：
   - 本人（必推）
   - 直属上级（如果 report_to 包含）
4. 调用 wecom-notify 推送
```

### 3.3 wecom-notify — 消息推送

**入口参数：**
```javascript
{
  to_users: [String],      // openid 列表
  msg_type: "text" | "markdown",
  title: String,
  content: String,
  task_id?: String,        // 关联任务（可选）
  url?: String             // 跳转链接（可选）
}
```

**核心逻辑：**
```
1. 根据 openid 查找 wecom_userid
2. 调用企业微信消息发送 API
3. 记录推送日志
```

---

## 四、前端适配

### 4.1 团队页面改造

```
┌─────────────────────────────────────────┐
│  团队                                    │
├─────────────────────────────────────────┤
│                                         │
│  【企业组织】（企业微信同步）             │
│  ├─ 产品研发部（15人）                   │
│  ├─ 运营部（8人）                        │
│  └─ 市场部（5人）                        │
│                                         │
│  ───────────────────────────────────    │
│                                         │
│  【我的团队】（手动创建）                 │
│  ├─ 创新项目组（3人）                    │
│  └─ 周末活动小组（5人）                  │
│                                         │
│  ───────────────────────────────────    │
│                                         │
│  + 创建团队                              │
│  + 加入团队                              │
│                                         │
└─────────────────────────────────────────┘
```

### 4.2 任务详情页适配

- 任务可以分配给"团队成员"或"部门成员"
- 复盘时可以选择抄送给"团队"或"上级"

---

## 五、开发排期

| 阶段 | 内容 | 预估 |
|------|------|------|
| **P0** | 数据层扩展（users 新增字段） | 0.5天 |
| **P0** | wecom-sync 云函数开发 | 2天 |
| **P1** | wecom-notify 云函数开发 | 1天 |
| **P1** | daily-report 云函数开发 | 2天 |
| **P2** | weekly-report 升级 | 1天 |
| **P2** | 前端团队页面适配 | 1天 |
| **P2** | 定时触发器配置 + 测试 | 0.5天 |
| **合计** | | **8天** |

---

## 六、前置条件

需要提供：
1. **企业微信 CorpID**
2. **自建应用 AgentID + Secret**
3. **权限开通**：通讯录读取、消息发送
4. **确认企业数量**：单一企业还是多企业

---

## 七、风险与备选方案

### 7.1 企业微信 API 限制

- access_token 有效期 2 小时，需要缓存
- 消息发送有频率限制
- 通讯录读取需要管理员权限

### 7.2 备选方案

如果企业微信接入受阻，可以：
1. 继续使用手动维护上下级关系
2. 在团队功能基础上增加"设置上级"功能
3. 使用飞书/钉钉等其他平台 API

