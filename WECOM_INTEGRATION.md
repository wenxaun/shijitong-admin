# 企业微信适配与接入方案

## 一、适配概述

事绩通小程序已准备支持企业微信环境，实现在微信和企业微信双端运行。

### 核心特性

- ✅ **双端兼容**：微信小程序和企业微信小程序均可运行
- ✅ **环境自动检测**：自动识别当前运行环境（微信/企业微信）
- ✅ **用户身份适配**：支持微信个人用户和企业员工身份
- ✅ **统一用户体验**：保持一致的UI/UX体验

---

## 二、平台差异性分析

### 2.1 账号体系

| 环境 | 用户身份 | 获取方式 | 数据存储 |
|------|---------|---------|---------|
| 微信小程序 | 微信个人用户 | `wx.login()` + `wx.getUserInfo()` | `openid` + `nickname` + `avatar_url` |
| 企业微信小程序 | 企业员工 | `wx.qy.login()` + 企业信息 | `openid` + `wecom_userid` + `department_id` |

### 2.2 接口差异

| 类别 | 微信支持 | 企业微信支持 | 企业微信专用 |
|------|---------|------------|-------------|
| 基础接口 | ✅ | ✅ | - |
| 云开发 | ✅ | ✅ | - |
| 分享功能 | ✅ | ✅ | `wx.qy.shareToChat` |
| 选择人员 | ❌ | ✅ | `wx.qy.selectEnterpriseContact` |
| 获取部门 | ❌ | ✅ | `wx.qy.getDepartment` |

### 2.3 不支持的接口（企业微信环境）

以下接口在企业微信环境不可用：
- ❌ 微信运动步数 (`wx.getWeRunData`)
- ❌ 收货地址 (`wx.chooseAddress`)
- ❌ 获取用户手机号（需使用企业微信专用接口）
- ❌ 部分享能力

---

## 三、接入方案

### 3.1 环境检测

已在 `src/utils/env.ts` 中实现环境检测工具：

```typescript
import { isWework, getEnvType, getUserType } from '@/utils/env';

// 检测是否企业微信环境
const isWeworkEnv = await isWework(); // boolean

// 获取环境类型
const envType = await getEnvType(); // 'weixin' | 'wework' | 'h5' | 'other'

// 获取用户类型
const userType = await getUserType(); // 'personal' | 'employee'
```

### 3.2 用户信息扩展

`User` 接口已预留企业微信字段：

```typescript
interface User {
  // 基础字段
  openid: string;
  nickname: string;
  avatar_url?: string;
  
  // 企业微信扩展字段
  wecom_userid?: string;         // 企业微信成员 UserID
  wecom_corpid?: string;         // 所属企业 ID
  department_id?: string;        // 主部门 ID
  department_name?: string;      // 主部门名称
}
```

### 3.3 登录流程适配

#### 微信环境登录流程
```
1. 调用 wx.login() 获取 code
2. 调用云函数 user-login
3. 云函数通过 code 换取 openid
4. 获取用户昵称和头像（用户主动选择/输入）
5. 保存用户信息到数据库
```

#### 企业微信环境登录流程
```
1. 调用 wx.qy.login() 获取 code
2. 调用云函数 user-login（需适配企业微信）
3. 云函数通过 code 换取 userid 和 corpId
4. 从企业微信获取员工详细信息（姓名、头像、部门）
5. 保存用户信息到数据库（包含 wecom_userid, department_id）
```

---

## 四、实施步骤

### 步骤 1：小程序关联企业（已完成前期准备）

#### 1.1 前置条件
- 已有微信小程序账号（AppID: wx2be578f65935b5e8）
- 已有企业微信账号（需提供企业ID）

#### 1.2 关联操作
1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 进入：**应用管理 → 小程序 → 关联小程序**
3. 输入小程序 AppID：`wx2be578f65935b5e8`
4. 等待小程序管理员确认关联

### 步骤 2：更新登录云函数

需要修改 `cloudfunctions/user-login/index.js` 以支持企业微信登录：

```javascript
// 检测环境
const isWework = event.environment === 'wxwork';

if (isWework) {
  // 企业微信登录
  const result = await cloud.qy.login();
  const { userid, corpId } = result;
  
  // 获取企业微信员工信息
  const userInfo = await cloud.qy.getUserInfo({ userid });
  
  // 保存或更新用户信息
  await updateUser({
    openid: `wework_${userid}_${corpId}`,
    wecom_userid: userid,
    wecom_corpid: corpId,
    department_id: userInfo.department[0],
    department_name: userInfo.department_name,
    nickname: userInfo.name,
    avatar_url: userInfo.avatar
  });
} else {
  // 微信登录（现有逻辑）
  // ...
}
```

### 步骤 3：配置企业微信开发者工具

#### 3.1 安装企业微信插件
1. 打开微信开发者工具
2. 进入：**设置 → 插件设置**
3. 搜索"企业微信"
4. 安装企业微信插件

#### 3.2 配置企业微信环境
1. 点击右上角"详情"
2. 进入"本地设置"
3. 勾选"使用企业微信基础库"
4. 输入企业ID（如需测试企业微信专有功能）

### 步骤 4：测试企业微信环境

#### 4.1 模拟器测试
1. 在开发者工具中切换到企业微信预览
2. 测试登录功能
3. 验证环境检测是否正确

#### 4.2 真机测试
1. 在企业微信中打开小程序
2. 测试所有功能
3. 验证微信和企业微信双端兼容性

### 步骤 5：发布与审核

#### 5.1 发布流程
1. 微信端：按正常流程发布到微信小程序平台
2. 企业微信端：在提交审核时选择"仅在企业微信运行"或"同时在微信和企业微信运行"

#### 5.2 审核材料（如选择"仅在企业微信运行"）
- ✅ 五张以上主要界面运行截图
- ✅ 主要场景使用录屏
- ✅ 版本描述需包含：
  - 小程序简介
  - 本次提交主要变化
  - 相关企业微信的企业全称及 corpID
  - 若为服务商小程序，需备注"本小程序为服务商小程序"

---

## 五、样式适配

### 5.1 UI 一致性
当前项目使用：
- **Tailwind CSS**：跨端样式系统
- **shadcn/ui 组件库**：通用UI组件
- **lucide-react-taro**：图标库

以上方案在微信和企业微信环境中表现一致，无需额外调整。

### 5.2 企业微信 WeUI（可选）
如需使用企业微信官方 WeUI 样式库：
- 引入 `weui-wxss` 组件库
- 替换部分组件样式以符合企业微信设计规范

**建议**：保持当前 Tailwind CSS 设计，确保品牌一致性。

---

## 六、API 兼容性处理

### 6.1 不支持的接口处理

```typescript
// 示例：微信运动步数
export async function getWeRunData() {
  const isWeworkEnv = await isWework();
  
  if (isWeworkEnv) {
    Taro.showToast({
      title: '企业微信暂不支持此功能',
      icon: 'none'
    });
    return null;
  }
  
  // 微信环境：调用 wx.getWeRunData()
  return Taro.getWeRunData();
}
```

### 6.2 企业微信专有接口

```typescript
// 示例：选择企业联系人
export async function selectEnterpriseContact() {
  const isWeworkEnv = await isWework();
  
  if (!isWeworkEnv) {
    Taro.showToast({
      title: '请使用企业微信打开',
      icon: 'none'
    });
    return [];
  }
  
  // 企业微信环境：调用 wx.qy.selectEnterpriseContact()
  return Taro.qy.selectEnterpriseContact({
    fromDepartmentId: 0,
    mode: 'single',
    type: ['user']
  });
}
```

---

## 七、云开发适配

### 7.1 数据库扩展
`users` 集合已包含企业微信相关字段，无需修改集合结构。

### 7.2 权限配置
确保数据库权限配置支持：
- 微信用户和企业用户均可读写
- 企业用户可以访问部门相关数据

---

## 八、常见问题

### Q1: 如何区分微信用户和企业用户？
**A**: 使用 `await isWework()` 检测环境，企业微信返回 true。

### Q2: 企业微信是否需要单独的 AppID？
**A**: 不需要，企业微信小程序使用与微信小程序相同的 AppID。

### Q3: 用户在企业微信和微信的账号是否互通？
**A**: 不互通，openid 不同。如需打通，需建立映射关系。

### Q4: 如何测试企业微信功能？
**A**: 
- 方式1：在开发者工具中切换企业微信预览
- 方式2：在企业微信中打开小程序真机测试

### Q5: 企业微信小程序可以同时发布到微信吗？
**A**: 可以，在提交审核时选择"同时在微信和企业微信运行"。

---

## 九、参考文档

- [企业微信开发前须知](https://developer.work.weixin.qq.com/document/path/92455)
- [企业微信小程序接入指南](https://developer.work.weixin.qq.com/document/path/91114)
- [WeUI for Work](https://developer.work.weixin.qq.com/devtool/introduce?id=36377)
- [企业微信设计规范](https://www.figma.com/design/CAUCBHcdCzFOddO7KtNtfe/WeCom-Design-%C2%B7-Developer-UI-Library)

---

## 十、下一步行动

### 立即可做
- ✅ 环境检测工具已实现（`src/utils/env.ts`）
- ✅ 系统信息初始化已添加（`src/app.tsx`）
- ✅ User 类型已预留企业微信字段

### 需要完成
- ⏳ 更新 `user-login` 云函数支持企业微信登录
- ⏳ 安装企业微信开发者工具插件
- ⏳ 配置企业微信测试环境
- ⏳ 测试企业微信登录流程
- ⏳ 提交企业微信审核

### 可选优化
- ⏳ 添加企业微信专有功能（部门选择、企业联系人选择）
- ⏳ 优化企业微信用户体验（基于部门推荐任务分配）
- ⏳ 数据统计报表（按部门、按员工）

---

**文档版本**：v1.0  
**最后更新**：2024年1月1日  
**维护者**：事绩通开发团队
