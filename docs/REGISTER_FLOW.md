# 📱 小程序用户注册流程 - 官方规范实现

**更新时间：** 2026-03-24  
**参考文档：** 微信小程序官方能力指南

---

## 📋 官方文档参考

### 1. 小程序登录
**文档：** https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html

**流程：**
```
1. 前端调用 wx.login() 获取 code
2. code 发送到云函数
3. 云函数用 code 换取 openid/session_key
4. 返回 openid 给前端使用
```

**代码示例：**
```javascript
wx.login({
  success: (res) => {
    if (res.code) {
      wx.cloud.callFunction({
        name: 'login',
        data: { code: res.code }
      })
    }
  }
})
```

---

### 2. 获取用户手机号
**文档：** https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html

**⚠️ 重要通知：**
从 2023 年 8 月 31 日起，手机号获取组件开始收费
- **价格：** 0.05 元/条
- **适用：** 生产环境
- **测试环境：** 建议手动输入

**官方组件（付费）：**
```xml
<button open-type="getPhoneNumber" bindgetphonenumber="getPhone">
  获取手机号
</button>
```

**测试方案（免费）：**
```xml
<input type="number" placeholder="手机号" />
```

---

### 3. 获取用户信息
**文档：** https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/user-info.html

**⚠️ 重要变更：**
`wx.getUserProfile` 已于 2022 年废弃

**现在推荐：**
1. **头像：** 使用 `<input type="nickname">` 或头像选择器
2. **昵称：** 用户手动输入
3. **头像选择：** `wx.chooseMedia`

**代码示例：**
```javascript
// 选择头像
wx.chooseMedia({
  count: 1,
  mediaType: ['image'],
  success: (res) => {
    const tempFilePath = res.tempFiles[0].tempFilePath
    // 上传到云存储
  }
})
```

---

## 🎯 当前实现方案

### 测试环境（免费）

**注册流程：**
```
1. 用户填写表单
   - 头像（选择器）
   - 昵称（手动输入）
   - 用户名（4-20 位）
   - 密码（6 位+）
   - 手机号（手动输入）

2. 调用 wx.login() 获取 code

3. 云函数用 code 换取 openid

4. 创建用户记录
   - openid（微信标识）
   - username（用户名）
   - password_hash（加密密码）
   - phone（手机号）
   - nickname（昵称）
   - avatar_url（头像云文件 ID）

5. 注册成功，自动登录
```

**微信一键登录：**
```
1. 调用 wx.login() 获取 code

2. 云函数换取 openid

3. 查询用户记录
   - 已注册：直接登录
   - 未注册：引导注册

4. 登录成功，跳转首页
```

---

### 生产环境（付费升级）

**需要修改的地方：**

**1. 获取手机号（付费）**
```xml
<!-- 替换手动输入 -->
<button 
  open-type="getPhoneNumber" 
  bindgetphonenumber="getPhoneNumber"
  class="phone-btn"
>
  获取手机号
</button>
```

```javascript
getPhoneNumber: function (e) {
  if (e.detail.code) {
    wx.cloud.callFunction({
      name: 'getPhoneNumber',
      data: {
        code: e.detail.code,
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv
      }
    }).then(res => {
      const phone = res.result.phoneNumber
      this.setData({ phone })
    })
  }
}
```

**2. 云函数解密手机号**
```javascript
// cloudfunctions/getPhoneNumber/index.js
const crypto = require('crypto')

exports.main = async (event) => {
  const { code, encryptedData, iv } = event
  
  // 用 code 换取 session_key
  const loginRes = await getLoginSession(code)
  const sessionKey = loginRes.session_key
  
  // 解密手机号
  const decoded = getDecryptData(encryptedData, iv, sessionKey)
  
  return {
    phoneNumber: decoded.phoneNumber,
    purePhoneNumber: decoded.purePhoneNumber
  }
}
```

---

## 📊 方案对比

| 项目 | 测试环境 | 生产环境 |
|------|----------|----------|
| **登录方式** | wx.login() | wx.login() |
| **openid 获取** | 云函数换取 | 云函数换取 |
| **手机号** | 手动输入（免费） | getPhoneNumber（0.05 元/条） |
| **头像** | wx.chooseMedia | wx.chooseMedia |
| **昵称** | 手动输入 | 手动输入 |
| **密码** | SHA256 加密 | SHA256 加密 |
| **成本** | 免费 | 约 0.05 元/注册用户 |

---

## 🔧 代码结构

### 前端页面

```
pages/register/
├── register.wxml    // 注册表单
├── register.js      // 注册逻辑
└── register.wxss    // 样式
```

### 云函数

```
cloudfunctions/
├── login/           // 微信登录（code 换 openid）
├── user-register/   // 用户注册
├── user-login/      // 用户登录
└── getPhoneNumber/  // 获取手机号（生产环境）
```

---

## 🚀 部署步骤

### 测试环境

1. **上传云函数**
   ```
   右键 login → 上传并部署
   右键 user-register → 上传并部署
   右键 user-login → 上传并部署
   ```

2. **测试注册**
   ```
   填写表单 → 点击注册 → 自动登录 → 跳转首页
   ```

3. **测试微信登录**
   ```
   点击微信一键登录 → 自动登录 → 跳转首页
   ```

### 生产环境

1. **开通付费服务**
   ```
   微信公众平台 → 设置 → 付费服务
   开通 getPhoneNumber 组件
   ```

2. **添加 getPhoneNumber 云函数**
   ```
   创建 cloudfunctions/getPhoneNumber
   上传并部署
   ```

3. **修改注册页面**
   ```
   替换手机号输入为 getPhoneNumber 按钮
   ```

---

## ⚠️ 注意事项

### 安全

1. **密码加密**
   - 前端不传输明文密码
   - 云函数 SHA256 加密存储

2. **openid 获取**
   - 前端不直接获取 openid
   - 通过云函数换取

3. **数据传输**
   - 使用 HTTPS（小程序默认）
   - 敏感数据加密

### 成本

1. **测试环境**
   - 完全免费
   - 适合开发测试

2. **生产环境**
   - getPhoneNumber：0.05 元/条
   - 云函数调用：免费额度内免费

### 用户体验

1. **简化流程**
   - 微信一键登录（推荐）
   - 手机号注册（备选）

2. **错误提示**
   - 用户名重复
   - 手机号格式错误
   - 密码强度不足

---

## 📞 后续优化

### 短期（1 周内）
- [ ] 添加短信验证（验证手机号）
- [ ] 添加密码强度检测
- [ ] 优化头像上传速度

### 中期（1 个月内）
- [ ] 接入 getPhoneNumber 组件
- [ ] 添加账号找回功能
- [ ] 添加多设备登录管理

### 长期（3 个月内）
- [ ] 接入微信 UnionID（多应用互通）
- [ ] 添加第三方登录（QQ、微博）
- [ ] 添加账号安全中心

---

_按官方规范实现，确保合规性和可扩展性_
