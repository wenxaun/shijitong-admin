# 企业微信接入配置指南

## 重要说明

企业微信 API 需要服务端 Secret，但通过微信云开发的「云调用」功能，可以安全地管理密钥，无需在代码中明文存储 corpSecret。

## 配置步骤

### 1. 小程序关联企业微信

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入「设置」→「关联设置」→「关联企业微信」
3. 按照指引关联您的企业微信应用

### 2. 开通云调用功能

1. 登录[微信云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入您的云开发环境
3. 点击「设置」→「环境设置」
4. 开通「云调用」功能

### 3. 配置企业微信应用

在云开发控制台中：

1. 点击「设置」→「环境设置」→「环境变量」
2. 添加以下环境变量（可选，可通过云开发管理界面配置）：

```bash
WECOM_AGENT_ID=1000001  # 企业应用的 ID
WX_TEMPLATE_ID=xxxxxx   # 微信订阅消息模板 ID
```

### 4. 配置云开发权限

1. 在云开发控制台进入「云函数」
2. 为以下云函数配置权限：
   - `wecom-sync-org` - 组织架构同步
   - `send-wecom-notification` - 企业微信消息推送

3. 点击云函数名称 →「权限设置」：
   - 开启「云调用」权限
   - 授权访问企业微信 API

## 云调用优势

### 安全性
- ✅ 密钥由微信云开发平台统一管理
- ✅ 无需在代码中明文存储 corpSecret
- ✅ 自动管理 access_token，无需手动刷新

### 开发效率
- ✅ 直接使用 `cloud.openapi.qywx.*` 调用企业微信 API
- ✅ 无需手动构建和签名请求
- ✅ 内置错误处理和重试机制

## 注意事项

### 1. 环境限制
- 云调用仅在微信小程序环境可用
- H5 和小程序开发工具环境需要降级处理

### 2. 权限要求
- 确保企业微信应用有相应的 API 权限
- 查看「企业微信管理后台」→「应用管理」→「权限配置」

### 3. 使用场景
**企业微信用户：**
- 在企业微信内打开小程序
- 可调用 `wx.qy.*` 系列 API
- 优先使用企业微信应用消息推送

**普通微信用户：**
- 在微信中打开小程序
- 无法调用企业微信 API
- 仅使用微信订阅消息

## 组织架构同步

### 增量同步策略

`wecom-sync-org` 云函数采用增量同步策略：

1. **部门同步**：
   - 获取企业微信部门列表
   - 与本地数据对比，仅更新变化的部门
   - 新增部门批量插入

2. **成员同步**：
   - 按部门获取成员列表
   - 与本地用户数据对比，仅更新变化的成员
   - 新增成员批量插入

3. **避免费用**：
   - 不采用全量覆盖
   - 减少写操作次数
   - 降低云数据库成本

### 同步时机

- 企业微信用户首次登录后自动触发
- 管理员可手动触发同步
- 定时同步（可选，通过云函数定时触发器）

## 消息推送

### 推送优先级

1. **企业微信应用消息**（优先）：
   - 触达率高
   - 实时性好
   - 适用于企业用户

2. **微信订阅消息**（补充）：
   - 需要用户授权
   - 有推送次数限制
   - 适用于个人用户

### 消息类型

- `task_assigned` - 任务分配通知
- `task_completed` - 任务完成通知
- `task_overdue` - 任务逾期提醒
- `task_reminder` - 任务提醒

### 使用示例

```javascript
// 发送企业微信消息
const result = await Taro.cloud.callFunction({
  name: 'send-wecom-notification',
  data: {
    to_user: 'user_userid',
    message_type: 'task_assigned',
    message_data: {
      task_name: '完成月度报告',
      require_date: '2024-12-31',
      priority: '高'
    }
  }
})
```

## 故障排查

### 问题1：云调用失败

**症状**：调用 `cloud.openapi.qywx.*` 返回错误

**解决**：
1. 确认已开通云调用功能
2. 检查云函数权限配置
3. 查看云开发控制台日志

### 问题2：无法获取企业数据

**症状**：`wecom-sync-org` 返回空数据

**解决**：
1. 确认小程序已关联企业微信
2. 检查 corp_id 是否正确
3. 确认用户在企业微信内打开小程序

### 问题3：消息推送失败

**症状**：`send-wecom-notification` 返回失败

**解决**：
1. 企业用户：检查 WECOM_AGENT_ID 是否正确
2. 个人用户：检查订阅消息模板 ID
3. 查看消息日志确认具体错误

## 参考文档

- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [企业微信 API 文档](https://developer.work.weixin.qq.com/document/path/90665)
- [云调用文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/openapi.html)
