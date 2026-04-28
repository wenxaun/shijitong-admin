# 企业微信测试问题排查指南

## 📸 问题：企业微信已关联但无法测试

### 问题现象
- 企业微信小程序已关联成功
- 但调用企业微信 API 时报错或功能不可用

---

## 🔍 排查步骤

### 步骤 1：确认测试环境

**关键点：必须在企业微信 APP 中测试**

❌ **错误方式：** 在微信开发者工具中直接测试
✅ **正确方式：** 在企业微信 APP 中打开

**操作步骤：**
1. 在微信开发者工具中点击 **预览**
2. 选择 **生成企业微信码**（不是微信码）
3. 使用 **企业微信 APP** 扫码打开

---

### 步骤 2：检查环境检测

在控制台执行以下代码，检查环境检测结果：

```javascript
// 在 App.tsx 或任意页面的 useEffect 中添加
useEffect(() => {
  Taro.getSystemInfo().then(res => {
    console.log('=== 环境检测 ===')
    console.log('platform:', res.platform)
    console.log('environment:', res.environment) // 企业微信应该是 'wxwork'
    console.log('SDKVersion:', res.SDKVersion)
    console.log('=== Taro 环境 ===')
    console.log('Taro.getEnv():', Taro.getEnv()) // 企业微信应该是 'wecom'
  })
}, [])
```

**预期结果：**
- 在企业微信 APP 中：`environment: 'wxwork'`，`Taro.getEnv(): 'wecom'`
- 在微信中：`environment: undefined`，`Taro.getEnv(): 'weapp'`

---

### 步骤 3：检查企业微信 API 是否可用

```javascript
// 在控制台执行
console.log('Taro.qy:', Taro.qy)
console.log('Taro.qy.selectEnterpriseContact:', Taro.qy?.selectEnterpriseContact)
```

**预期结果：**
- 企业微信环境：`Taro.qy` 为 `object`，`selectEnterpriseContact` 为 `function`
- 非企业微信环境：`Taro.qy` 为 `undefined`

---

### 步骤 4：检查企业微信应用权限

登录企业微信管理后台：https://work.weixin.qq.com/

#### 4.1 检查小程序关联
```
应用管理 → 小程序 → 查看已关联小程序
```
- 确认小程序已关联
- 记录小程序 AppID（应该 ww 开头）

#### 4.2 检查应用权限
```
应用管理 → 应用 → 选择你的小程序 → 权限管理
```

**必须配置的权限：**
- ✅ **通讯录权限**：读取成员、读取部门
- ✅ **消息推送**：发送企业微信消息
- ✅ **管理工具**：管理组织架构（可选）

#### 4.3 检查可见范围
```
应用管理 → 应用 → 选择你的小程序 → 可见范围
```
- 设置可见部门和成员
- 确保你的账号在可见范围内

---

### 步骤 5：检查代码中的 userid 映射问题

**⚠️ 重要：企业微信 userid ≠ 微信 openid**

在 `src/pages/task-transfer/index.tsx` 第 99 行：

```typescript
// ❌ 错误：直接使用企业微信 userid 作为 openid
openid: user.userid,

// ✅ 正确：需要通过云函数映射
openid: await mapWecomUseridToOpenid(user.userid),
```

**修复方案：**

在云函数中添加映射逻辑：

```javascript
// cloudfunctions/map-wecom-userid/index.js
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { wecom_userid, corp_id } = event
  const db = cloud.database()
  
  // 通过企业微信 userid 查找对应的用户 openid
  const userResult = await db.collection('users')
    .where({
      wecom_userid: wecom_userid,
      wecom_corpid: corp_id
    })
    .get()
  
  if (userResult.data.length === 0) {
    return {
      success: false,
      message: '用户不存在或未登录过'
    }
  }
  
  return {
    success: true,
    openid: userResult.data[0].openid
  }
}
```

---

### 步骤 6：检查云函数调用

如果需要调用企业微信 API（如发送消息），确保云函数配置正确：

#### 6.1 检查云函数权限
在云函数根目录的 `config.json` 中：

```json
{
  "permissions": {
    "openapi": [
      "message/corp/send",
      "user/get"
    ]
  }
}
```

#### 6.2 检查云调用配置
确保云调用已配置：
```
云开发 → 设置 → 云调用 → 启用
```

---

## 🛠️ 常见错误及解决方案

### 错误 1：`[] 当前账号不支持`

**原因：**
- 在微信开发者工具中直接测试企业微信 API
- 未在企业微信 APP 中打开

**解决方案：**
1. 使用企业微信 APP 扫码打开小程序
2. 确保使用的是企业微信码（不是微信码）

---

### 错误 2：`Taro.qy is undefined`

**原因：**
- 不在企业微信环境
- Taro 版本不支持企业微信

**解决方案：**
1. 检查 `package.json` 中 `@tarojs/taro` 版本是否 ≥ 3.0
2. 添加环境检测代码（已在 `src/utils/env.ts` 中实现）

---

### 错误 3：`用户不存在或未登录过`

**原因：**
- 企业微信 userid 未映射到系统用户

**解决方案：**
1. 确保用户先通过企业微信登录
2. 检查 `user-login` 云函数是否正确保存了 `wecom_userid`

---

### 错误 4：API 调用成功但没有结果

**原因：**
- 企业微信应用权限不足
- 可见范围配置不正确

**解决方案：**
1. 检查应用权限配置
2. 检查可见范围是否包含当前用户

---

## 📋 完整测试流程

### 1. 准备阶段
- [ ] 企业微信管理后台关联小程序
- [ ] 配置应用权限（通讯录、消息推送）
- [ ] 设置可见范围
- [ ] 创建云函数权限配置

### 2. 开发阶段
- [ ] 实现环境检测（`src/utils/env.ts`）
- [ ] 添加 API 可用性检查
- [ ] 实现企业微信用户登录
- [ ] 实现 userid 到 openid 映射

### 3. 测试阶段
- [ ] 微信开发者工具编译
- [ ] 生成企业微信码
- [ ] 企业微信 APP 扫码打开
- [ ] 测试企业微信 API 调用
- [ ] 验证权限和可见性

### 4. 调试阶段
- [ ] 打开企业微信 APP 开发调试
- [ ] 查看 Console 输出
- [ ] 检查网络请求
- [ ] 验证云函数调用

---

## 🎯 快速修复代码

### 修复 1：增强错误提示

在 `src/pages/task-transfer/index.tsx` 中：

```typescript
const handleSelectFromWecom = () => {
  console.log('=== 企业微信环境检测 ===')
  console.log('isWeworkEnv:', isWeworkEnv)
  console.log('Taro.qy:', Taro.qy)
  
  if (!isWeworkEnv) {
    Taro.showModal({
      title: '环境提示',
      content: '此功能仅支持在企业微信中使用，请确认使用企业微信 APP 打开',
      showCancel: false
    })
    return
  }

  // @ts-ignore
  if (!Taro.qy || !Taro.qy.selectEnterpriseContact) {
    Taro.showModal({
      title: 'API 不可用',
      content: '企业微信 API 不可用，请检查：\n1. 是否使用企业微信 APP 打开\n2. 应用权限是否正确配置\n3. 可见范围是否包含当前用户',
      showCancel: false
    })
    return
  }

  // 调用企业微信 API...
}
```

### 修复 2：添加 userid 映射

创建 `src/api/wecom.ts`：

```typescript
import { callCloudFunction } from '@/utils/cloud'

export async function mapWecomUseridToOpenid(wecom_userid: string) {
  const res = await callCloudFunction('map-wecom-userid', { wecom_userid })
  return res.data.openid
}
```

---

## 📞 获取帮助

如果以上步骤都无法解决问题，请提供以下信息：

1. **环境信息：**
   - `Taro.getEnv()` 输出
   - `Taro.getSystemInfo()` 输出
   - 企业微信 APP 版本

2. **错误信息：**
   - 控制台报错
   - 网络请求失败信息
   - 截图

3. **配置信息：**
   - 小程序 AppID
   - 应用权限配置
   - 可见范围设置

---

## 🔗 相关文档

- [企业微信小程序开发文档](https://developer.work.weixin.qq.com/document/path/91116)
- [企业微信 API 列表](https://developer.work.weixin.qq.com/document/path/94891)
- [云调用 - 企业微信](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started-cloud-call.html)
