# 企业微信测试环境配置指南

本指南帮助你在微信开发者工具中配置企业微信测试环境，用于测试企业微信相关功能。

## 📋 前置要求

1. ✅ 已有企业微信账号（企业管理员或开发者）
2. ✅ 已有微信小程序账号（当前 AppID: wx2be578f65935b5e8）
3. ✅ 已安装微信开发者工具（最新稳定版）

---

## 🚀 配置步骤

### 步骤一：获取企业微信小程序 AppID

#### 方式一：关联已有小程序到企业微信

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 进入 **应用管理** → **小程序** → **关联小程序**
3. 点击 **关联已有小程序**
4. 输入小程序 AppID：`wx2be578f65935b5e8`
5. 扫码确认关联

#### 方式二：创建企业微信专用小程序

1. 访问 [企业微信小程序管理](https://open.work.weixin.qq.com/wwopen/devtool)
2. 点击 **创建小程序**
3. 填写小程序信息，获取企业微信 AppID
4. 记录下新的 AppID（格式：ww 开头）

**推荐使用方式一**，这样可以同时支持普通微信用户和企业微信用户。

---

### 步骤二：配置小程序支持企业微信

#### 1. 配置可信域名

登录 [微信小程序管理后台](https://mp.weixin.qq.com/)：

1. 进入 **开发** → **开发管理** → **开发设置**
2. 配置以下域名（使用云开发无需配置）
   - 服务器域名：使用云开发域名
   - 业务域名：按需配置

#### 2. 开通企业微信互通

1. 进入 **设置** → **关联设置** → **关联企业微信**
2. 添加企业微信（输入企业 ID）
3. 开启 **企业微信互通**

---

### 步骤三：配置微信开发者工具

#### 1. 切换到企业微信模式

打开微信开发者工具：

1. 点击右上角 **项目** → **项目配置**
2. 在 **编译设置** 中找到 **调试基础库**
3. 勾选 **企业微信** 复选框
4. 重启开发者工具

#### 2. 创建企业微信项目配置文件

创建 `project.qymp.json` 文件（企业微信小程序配置）：

```json
{
  "miniprogramRoot": "./dist-weapp",
  "cloudfunctionRoot": "./cloudfunctions/",
  "projectname": "事绩通-企业版",
  "description": "事绩通 - 企业微信版",
  "appid": "wwxxxxxxxxxxxxxxxx",  // 替换为你的企业微信 AppID
  "setting": {
    "urlCheck": false,
    "es6": false,
    "enhance": false,
    "compileHotReLoad": false,
    "postcss": false,
    "minified": true,
    "coverView": true,
    "autoAudits": false,
    "newFeature": false,
    "uglifyFileName": false,
    "uploadWithSourceMap": false,
    "useIsolateContext": true,
    "nodeModules": false,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    },
    "enableEngineNative": false,
    "useIsolateWebview": true,
    "userConfirmedBundleSwitch": false,
    "packNpmManually": false,
    "packNpmRelationList": [],
    "minifyWXSS": true,
    "showES6CompileOption": false
  },
  "compileType": "miniprogram",
  "condition": {},
  "libVersion": "2.27.3"
}
```

#### 3. 配置云开发环境

1. 打开云开发控制台
2. 创建环境（如：`wecom-dev`）
3. 记录环境 ID
4. 在代码中配置环境 ID

---

### 步骤四：配置企业微信应用权限

#### 1. 创建企业应用

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 进入 **应用管理** → **应用** → **创建应用**
3. 选择 **小程序**
4. 填写应用信息：
   - 应用名称：`事绩通`
   - 应用介绍：`任务管理系统`
   - 应用 Logo：上传应用图标

#### 2. 配置应用权限

在应用配置中启用以下权限：

- ✅ **通讯录权限**：读取成员、部门信息
- ✅ **消息推送**：发送企业微信消息
- ✅ **外部联系人**：如需外部协作
- ✅ **管理工具**：管理组织架构

#### 3. 配置可见范围

设置应用可见范围：
- 选择可见部门
- 选择可见成员
- 设置管理员权限

---

### 步骤五：测试企业微信环境

#### 方式一：使用企业微信开发者工具

1. 下载 [企业微信开发者工具](https://developer.work.weixin.qq.com/document/tool/miniProgram_down)
2. 使用企业微信账号登录
3. 打开项目，选择 `project.qymp.json`
4. 编译并预览

#### 方式二：使用微信开发者工具切换环境

1. 打开微信开发者工具
2. 点击 **工具** → **构建 npm**
3. 点击 **工具** → **编译**
4. 点击 **预览** → **生成企业微信码**
5. 使用企业微信扫码预览

**注意**：企业微信码需要在企业微信 APP 中打开才能看到完整功能。

---

### 步骤六：验证企业微信功能

#### 1. 检查环境检测

打开控制台（Console），输入：

```javascript
console.log(Taro.getEnv());
// 应输出: "weapp" (微信) 或 "wecom" (企业微信)
```

#### 2. 测试企业微信 API

```javascript
// 测试 API 是否可用
console.log(typeof Taro.qy); // 应为 "object"
console.log(typeof Taro.qy.selectEnterpriseContact); // 应为 "function"
```

#### 3. 测试通讯录选择

点击企业通讯录选择按钮，验证是否能正常选择联系人。

---

## 🔧 常见问题

### Q1: 报错 "当前账号不支持"

**原因**：
1. 未在企业微信环境中打开
2. 未配置企业微信应用权限
3. AppID 不匹配

**解决**：
1. 确保使用企业微信 APP 扫码打开
2. 检查企业微信应用权限配置
3. 确认使用正确的企业微信 AppID

### Q2: 企业微信 API 不可用

**原因**：
- 未在 `project.qymp.json` 中配置正确的 AppID

**解决**：
1. 检查 `project.qymp.json` 中的 `appid` 是否正确
2. 重新编译项目
3. 清除缓存后重试

### Q3: 云函数调用失败

**原因**：
- 云开发环境未配置

**解决**：
1. 在微信开发者工具中打开云开发控制台
2. 创建云开发环境
3. 在代码中配置环境 ID

### Q4: 无法看到企业组织架构

**原因**：
- 未同步企业组织架构

**解决**：
1. 调用 `wecom-sync-org` 云函数同步组织架构
2. 检查企业微信应用权限是否包含通讯录读取

---

## 📚 企业微信 API 文档

- [企业微信小程序开发文档](https://developer.work.weixin.qq.com/document/path/91015)
- [企业微信 API 文档](https://developer.work.weixin.qq.com/document/path/90665)
- [企业微信消息推送](https://developer.work.weixin.qq.com/document/path/90669)

---

## ✅ 检查清单

测试前请确认：

- [ ] 已获取企业微信小程序 AppID
- [ ] 已创建 `project.qymp.json` 配置文件
- [ ] 已配置云开发环境
- [ ] 已创建企业微信应用
- [ ] 已配置应用权限
- [ ] 已同步企业组织架构
- [ ] 代码中已添加环境检测和 API 可用性检查

---

## 🎯 快速开始

### 最简单的测试方式

如果你只是想快速测试代码逻辑：

1. **使用模拟模式**（推荐）
   ```typescript
   // 在代码中添加模拟开关
   const MOCK_WECOM_MODE = true; // 模拟模式

   if (MOCK_WECOM_MODE) {
     // 返回模拟数据
     handleMockSelect();
   } else {
     // 调用真实 API
     handleRealSelect();
   }
   ```

2. **使用企业微信网页版测试**
   - 访问企业微信网页版
   - 在网页版中测试小程序

---

## 📞 技术支持

如果遇到问题：

1. 查看控制台错误日志
2. 检查企业微信应用权限配置
3. 查看云开发日志
4. 参考 [企业微信开发文档](https://developer.work.weixin.qq.com/)

---

**提示**：企业微信环境测试需要实际的 AppID 和企业微信账号，无法在纯微信小程序环境中完整测试。
