# 企业微信接入开发方向评估报告

## 📊 整体评估

**总体结论：✅ 开发方向基本合理**

用户提出的开发方向覆盖了企业微信接入的核心功能，数据模型、云函数、页面设计基本完整。但部分设计需要调整以适配现有架构，避免重复开发。

---

## 1️⃣ 数据模型扩展评估

### Users 集合字段对比

| 提议字段 | 现有字段 | 评估结果 | 建议 |
|---------|---------|---------|------|
| `corp_id` | `wecom_corpid` | ✅ 重复 | 使用现有 `wecom_corpid` |
| `work_wechat_userid` | `wecom_userid` | ✅ 重复 | 使用现有 `wecom_userid` |
| `job_title` | ❌ 缺失 | ✅ 需新增 | 建议新增 |
| `supervisor_openid` | `manager_id` | ⚠️ 功能重叠 | 保留 `manager_id`，语义更通用 |
| `department_ids` | `department_id` | ⚠️ 单数 vs 数组 | 建议扩展为数组 `department_ids` |
| `user_type` | `user_type` | ✅ 已有 | 使用现有 |

**建议调整：**
```typescript
// 建议新增字段
interface User {
  // ... 现有字段

  // 新增字段
  job_title?: string;              // 职位
  department_ids: string[];        // 所属部门 ID 列表（扩展自 department_id）
  // supervisor_openid 不需要，已有 manager_id 覆盖相同功能
}
```

### Tasks 集合字段对比

| 提议字段 | 现有字段 | 评估结果 | 建议 |
|---------|---------|---------|------|
| `team_id` | `group_id` | ⚠️ 概念混淆 | 需明确区分团队和部门 |
| `reviewer_id` | ❌ 缺失 | ✅ 需新增 | 建议新增 |
| `transfer_history` | `flow_history` | ⚠️ 命名不同 | 保留 `flow_history`，语义更准确 |
| `watchers` | ❌ 缺失 | ✅ 需新增 | 建议新增 |
| `source_type` | `source.type` | ✅ 已有 | 使用现有 `source.type` |

**建议调整：**
```typescript
interface Task {
  // ... 现有字段

  // 新增字段
  reviewer_id?: string;            // 审核人 openid
  watchers: string[];              // 关注人列表（openid）

  // 说明：不重复添加 transfer_history，已有 flow_history
  // 说明：不重复添加 team_id，使用 group_id 区分团队/部门
  // 说明：source_type 已在 source.type 中
}
```

**关键问题：team_id vs group_id**
- 当前系统使用 `group_id` 表示任务分组（如"紧急任务"、"日常任务"）
- 企业微信的部门/团队概念需要明确映射
- **建议方案：**
  - 保留 `group_id` 用于个人任务分组
  - 新增 `org_team_id` 用于企业团队/部门归属
  - 或者在 `group_id` 中增加前缀区分（如 `team:xxx`、`org:xxx`）

---

## 2️⃣ 云函数评估

| 云函数 | 现有云函数 | 评估结果 | 建议 |
|--------|-----------|---------|------|
| `wxwork-auth` | ❌ 缺失 | ⚠️ 需明确场景 | 建议整合到 `user-login` |
| `wxwork-sync-org` | `wecom-sync-org` | ✅ 已有 | 使用现有云函数 |
| `wxwork-sync-users` | `wecom-sync-org` | ⚠️ 功能重叠 | 在现有云函数中实现 |
| `task-transfer` | ❌ 缺失 | ✅ 需新增 | 建议新增 |
| `task-review` | ❌ 缺失 | ✅ 需新增 | 建议新增 |
| `push-notification` | `send-wecom-notification`<br>`send-notification` | ⚠️ 需整合 | 建议统一为 `push-notification` |

### 详细评估

#### ✅ `wxwork-auth` - 企业微信 OAuth
**当前状态：** `user-login` 已支持企业微信登录
```javascript
// cloudfunctions/user-login/index.js (第65-75行)
if (environment === 'wework') {
  // 企业微信登录逻辑
  const corpId = event.corpId || process.env.WECOM_CORP_ID
  const userId = event.userId
  const corpToken = cloud.getAccessToken({ type: 'wecom_corp' })
  // ...
}
```

**建议：**
- 不需要单独创建 `wxwork-auth`
- 在 `user-login` 中已经处理企业微信身份获取
- 如需额外的企业微信 OAuth 流程（如扫码登录），可在 `user-login` 中扩展

#### ✅ `wxwork-sync-org` - 组织架构同步
**当前状态：** 已有 `wecom-sync-org` 云函数

**建议：**
- 重命名为 `wxwork-sync-org` 保持命名一致
- 完善增量同步逻辑
- 添加同步标记字段（如 `last_sync_at`）

#### ⚠️ `wxwork-sync-users` - 成员信息同步
**当前状态：** 功能部分在 `wecom-sync-org` 中实现

**建议：**
- 整合到 `wxwork-sync-org` 云函数
- 同步部门时同步成员信息
- 避免两次云函数调用，提高效率

**优化方案：**
```javascript
// cloudfunctions/wxwork-sync-org/index.js
exports.main = async (event, context) => {
  const { type = 'all' } = event

  // 同步部门
  if (type === 'all' || type === 'departments') {
    await syncDepartments()
  }

  // 同步成员
  if (type === 'all' || type === 'users') {
    await syncUsers()
  }
}
```

#### ✅ `task-transfer` - 任务转交
**当前状态：** 缺失

**建议：**
- 新增云函数实现任务转交
- 记录流转历史到 `flow_history`
- 通知原执行人和新执行人
- 支持批量转交

**核心逻辑：**
```javascript
exports.main = async (event, context) => {
  const { task_id, from_user_id, to_user_id, reason } = event

  // 1. 验证权限
  // 2. 更新任务执行人
  // 3. 记录流转历史
  // 4. 发送通知
  // 5. 记录操作日志
}
```

#### ✅ `task-review` - 任务审核
**当前状态：** 缺失

**建议：**
- 新增云函数实现任务审核
- 支持通过/拒绝
- 记录审核人、审核意见、审核时间
- 通知任务发布人

**核心逻辑：**
```javascript
exports.main = async (event, context) => {
  const { task_id, reviewer_id, action, comment } = event

  // 1. 验证权限（审核人）
  // 2. 更新任务状态
  // 3. 记录审核信息
  // 4. 发送通知
}
```

#### ⚠️ `push-notification` - 统一推送
**当前状态：** 有 `send-notification` 和 `send-wecom-notification`

**建议：**
- 整合为统一的 `push-notification` 云函数
- 自动判断用户类型（个人/企业）
- 优先使用企业微信应用消息
- 失败降级到订阅消息

**优化方案：**
```javascript
exports.main = async (event, context) => {
  const { to_user_id, message_type, message_data } = event

  // 1. 查询用户信息
  const user = await getUser(to_user_id)

  // 2. 企业用户：发送企业微信消息
  if (user.is_wework_user) {
    return await sendWecomMessage(to_user_id, message_type, message_data)
  }

  // 3. 个人用户：发送订阅消息
  return await sendSubscribeMessage(to_user_id, message_type, message_data)
}
```

---

## 3️⃣ 页面评估

| 页面 | 当前状态 | 评估结果 | 建议 |
|------|---------|---------|------|
| `pages/org-tree` | ❌ 缺失 | ✅ 需新增 | 建议新增 |
| `pages/wxwork-bind` | ❌ 缺失 | ⚠️ 需明确场景 | 建议新增（独立小程序场景） |
| `pages/task-transfer` | ❌ 缺失 | ✅ 需新增 | 建议新增 |
| `pages/team/index` | `pages/team` | ⚠️ 需增强 | 已有"我的企业"Tab，需完善 |
| `pages/create/index` | 已存在 | ⚠️ 需增强 | 添加企业通讯录选择 |
| `pages/detail/index` | 已存在 | ⚠️ 需增强 | 添加转交、审核操作 |

### 详细评估

#### ✅ `pages/org-tree` - 组织架构树形展示
**建议新增，功能包括：**
- 树形展示企业组织架构
- 部门成员列表
- 部门任务统计
- 快速筛选部门成员

**UI 建议：**
```tsx
// 使用 Tree 组件展示组织架构
<Tree
  data={orgTree}
  renderNode={(node) => (
    <View className="flex items-center justify-between">
      <Text>{node.name}</Text>
      <Text className="text-sm text-gray-400">{node.memberCount}人</Text>
    </View>
  )}
/>
```

#### ⚠️ `pages/wxwork-bind` - 企业微信绑定引导页
**场景分析：**
- 如果小程序关联企业微信后，员工在企微内打开自动获取身份
- 此页面主要适用于：独立小程序 + 企业微信单点登录（SSO）场景

**建议：**
- 当前可暂缓开发（企业微信关联后无需单独绑定）
- 如需支持独立小程序 SSO，后续开发

#### ✅ `pages/task-transfer` - 任务流转页
**建议新增，功能包括：**
- 选择接收人（支持搜索、按部门筛选）
- 填写交接说明
- 预览流转记录
- 确认转交

**核心逻辑：**
```tsx
// 调用 task-transfer 云函数
await Taro.cloud.callFunction({
  name: 'task-transfer',
  data: {
    task_id: taskId,
    to_user_id: selectedUser.openid,
    reason: transferReason
  }
})
```

#### ⚠️ `pages/team/index` - 团队页
**当前状态：** 已有，"我的企业"Tab 已实现企业信息展示

**建议增强：**
- 添加组织架构树形展示
- 显示部门成员列表
- 部门任务统计
- 快速进入部门任务视图

#### ⚠️ `pages/create/index` - 创建任务页
**当前状态：** 已有基础创建功能

**建议增强：**
- 企业用户：支持从企业通讯录选择执行人
- 添加企业微信联系人选择器
- 快速选择部门成员

**核心代码：**
```tsx
// 企业微信环境显示联系人选择
{isWework && (
  <Button onClick={handleSelectEnterpriseContact}>
    从企业通讯录选择
  </Button>
)}

// 选择企业联系人
const handleSelectEnterpriseContact = () => {
  Taro.qy.selectEnterpriseContact({
    fromDepartmentId: 0,
    mode: 'multi',
    type: ['user'],
    success: (res) => {
      const users = res.result.userList
      setSelectedExecutors(users)
    }
  })
}
```

#### ⚠️ `pages/detail/index` - 任务详情页
**当前状态：** 已有基础详情展示

**建议增强：**
- 添加"转交"操作（授权用户可见）
- 添加"审核"操作（审核人可见）
- 显示流转历史记录
- 显示关注人列表

---

## 4️⃣ 执行建议

### 阶段一：数据模型调整（优先级：🔴 高）

**任务清单：**
1. ✅ 扩展 `User` 类型
   - 添加 `job_title` 字段
   - 扩展 `department_id` 为 `department_ids: string[]`

2. ✅ 扩展 `Task` 类型
   - 添加 `reviewer_id` 字段
   - 添加 `watchers: string[]` 字段
   - 明确 `group_id` 语义

3. ⚠️ 明确团队与部门映射关系
   - 方案A：新增 `org_team_id` 字段
   - 方案B：`group_id` 使用前缀区分

**预计工时：** 0.5 天

---

### 阶段二：云函数开发（优先级：🔴 高）

**任务清单：**

1. ⚠️ 整合现有云函数
   - `wecom-sync-org` → `wxwork-sync-org`
   - 在 `wxwork-sync-org` 中整合成员同步
   - 重构 `send-notification` + `send-wecom-notification` → `push-notification`

2. ✅ 新增 `task-transfer` 云函数
   - 权限验证
   - 任务执行人更新
   - 流转历史记录
   - 通知发送

3. ✅ 新增 `task-review` 云函数
   - 审核权限验证
   - 任务状态更新
   - 审核记录保存
   - 通知发送

**预计工时：** 2 天

---

### 阶段三：页面开发（优先级：🟡 中）

**任务清单：**

1. ✅ 新增 `pages/task-transfer/index.tsx`
   - 接收人选择器
   - 交接说明输入
   - 确认转交

2. ⚠️ 增强 `pages/create/index.tsx`
   - 企业通讯录选择器
   - 部门筛选

3. ⚠️ 增强 `pages/detail/index.tsx`
   - 转交操作入口
   - 审核操作入口
   - 流转历史展示
   - 关注人列表

4. ⚠️ 增强 `pages/team/index.tsx`
   - 组织架构树形展示
   - 部门成员列表
   - 部门任务统计

5. ✅ 新增 `pages/org-tree/index.tsx`
   - 树形组织架构展示
   - 部门信息
   - 成员列表

**预计工时：** 3 天

---

### 阶段四：功能完善（优先级：🟢 低）

**任务清单：**

1. ⚠️ 企业微信绑定页（独立小程序场景）
   - 二维码展示
   - 绑定引导
   - 绑定状态检查

2. ✅ 消息推送优化
   - 推送模板优化
   - 推送失败重试
   - 推送统计分析

**预计工时：** 1 天

---

## 5️⃣ 风险提示

### 🔴 高风险

1. **并发同步问题**
   - 风险：多个用户同时触发组织架构同步
   - 解决：添加同步锁，防止并发

2. **数据一致性问题**
   - 风险：企业微信数据与本地数据不一致
   - 解决：增加同步标记，定期校验

3. **权限控制复杂度**
   - 风险：任务转交、审核权限判断复杂
   - 解决：完善权限中间件，明确权限规则

### 🟡 中风险

1. **性能问题**
   - 风险：组织架构数据量大导致同步慢
   - 解决：增量同步、分页查询

2. **推送失败**
   - 风险：订阅消息未授权、企业微信推送失败
   - 解决：失败重试、降级处理

### 🟢 低风险

1. **UI 适配**
   - 风险：不同平台（微信/企业微信）UI 差异
   - 解决：平台检测、统一设计规范

---

## 6️⃣ 总结

### ✅ 优点

1. **功能覆盖完整**：覆盖了企业微信接入的核心场景
2. **架构设计合理**：数据模型、云函数、页面层次清晰
3. **扩展性良好**：预留了扩展字段，便于后续迭代

### ⚠️ 需要调整

1. **避免重复开发**
   - `wxwork-auth` → 整合到 `user-login`
   - `wxwork-sync-users` → 整合到 `wxwork-sync-org`
   - `push-notification` → 整合现有推送云函数

2. **字段命名统一**
   - 使用现有字段避免重复
   - 明确 `team_id` 和 `group_id` 语义

3. **优先级明确**
   - 先完成数据模型调整
   - 再开发核心云函数
   - 最后完善页面交互

### 📅 建议开发顺序

```
第1周（数据模型 + 云函数）
  ├─ 阶段一：数据模型调整（0.5天）
  └─ 阶段二：云函数开发（4.5天）

第2周（页面开发）
  └─ 阶段三：页面开发（5天）

第3周（测试优化）
  ├─ 阶段四：功能完善（1天）
  ├─ 测试与Bug修复（3天）
  └─ 文档编写（1天）
```

### 🎯 关键成功因素

1. **增量同步**：避免全量覆盖，控制成本
2. **权限控制**：明确转交、审核权限，避免越权
3. **消息推送**：企业微信优先，订阅消息降级
4. **用户体验**：个人/企业模式切换顺畅

---

## 📝 评估结论

**开发方向：✅ 基本合理，建议按上述调整后执行**

**核心建议：**
1. 整合现有功能，避免重复开发
2. 明确字段语义，统一命名规范
3. 按优先级分阶段实施
4. 重点关注并发、权限、性能问题

**预期收益：**
- 支持企业微信完整工作流
- 提升企业用户协作效率
- 实现任务跨团队流转
- 完善任务审批机制
