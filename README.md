# 事绩通 - 小程序部署指南

**版本：** v1.0.0  
**环境 ID：** cloud1-3g7j95ax4a0f4a3f  
**AppID：** wx2be578f65935b5e8

---

## 📁 项目结构

```
shijitong-miniprogram/
├── cloudfunctions/          # 云函数（后端）
│   ├── task-create/        # 创建任务
│   ├── task-list/          # 获取任务列表
│   ├── task-update/        # 更新任务（含自动评分）
│   ├── task-delete/        # 删除任务
│   └── user-login/         # 用户登录
├── miniprogram/             # 小程序前端
│   ├── pages/
│   │   ├── index/          # 首页（任务列表）
│   │   ├── create/         # 创建任务
│   │   ├── detail/         # 任务详情
│   │   └── profile/        # 个人中心
│   ├── app.js
│   ├── app.json
│   └── app.wxss
└── project.config.json      # 项目配置
```

---

## 🚀 部署步骤

### 步骤 1：打开微信开发者工具

1. 打开微信开发者工具
2. 导入项目 → 选择 `shijitong-miniprogram` 文件夹
3. 确认 AppID 为 `wx2be578f65935b5e8`

### 步骤 2：上传云函数

**每个云函数都需要单独上传：**

```
1. 在开发者工具左侧文件树找到 cloudfunctions/task-create
2. 右键点击 → 选择「上传并部署：云端安装依赖」
3. 等待上传完成（状态变为绿色）
4. 重复以上步骤上传其他云函数：
   - task-list
   - task-update
   - task-delete
   - user-login
```

### 步骤 3：配置数据库权限

**在云开发控制台设置：**

```
1. 点击顶部「云开发」按钮
2. 进入「数据库」
3. 分别点击 tasks、users、reviews 集合
4. 点击「权限设置」
5. 选择「所有用户可读写」（或自定义规则）
```

### 步骤 4：编译预览

```
1. 点击开发者工具顶部「编译」按钮
2. 查看小程序运行效果
3. 测试创建任务、查看列表、更新状态等功能
```

### 步骤 5：上传代码（可选）

```
1. 点击右上角「上传」按钮
2. 填写版本号和备注
3. 上传到微信后台
4. 登录 mp.weixin.qq.com 提交审核
```

---

## 📊 数据库集合说明

### tasks（任务表）

| 字段 | 类型 | 说明 |
|-----|------|------|
| task_name | String | 任务名称 |
| task_description | String | 任务描述 |
| status | String | pending/in_progress/completed/cancelled |
| priority | String | P0/P1/P2/P3 |
| category | String | 分类 |
| publisher_id | String | 发布人 OPENID |
| executor_id | String | 执行人 OPENID |
| require_date | Date | 要求完成日期 |
| complete_date | Date | 实际完成日期 |
| score | Number | 得分（100/80/60-79/45-59/30） |
| score_note | String | 评分说明 |
| learnings | String | 学习收获 |
| delay_reason | String | 延迟原因 |
| improvements | String | 反思改进 |
| attribution_tags | Array | 归因分类 |
| created_at | Date | 创建时间 |
| updated_at | Date | 更新时间 |

### users（用户表）

| 字段 | 类型 | 说明 |
|-----|------|------|
| openid | String | 用户 OPENID |
| appid | String | 小程序 AppID |
| nickname | String | 昵称 |
| avatar_url | String | 头像 URL |
| role | String | executor/publisher/admin |
| created_at | Date | 创建时间 |
| last_login | Date | 最后登录时间 |

### reviews（复盘表）

用于存储详细的复盘记录（可选，当前复盘数据直接存在 tasks 表中）

---

## 🎯 核心功能

### 1. 自动评分规则

| 完成情况 | 得分 | 说明 |
|---------|------|------|
| 提前完成 | 100 分 | 满分 |
| 按时完成 | 80 分 | 及格 |
| 延迟 1 天 | 79 分 | 轻微延迟 |
| 延迟 2-3 天 | 60-78 分 | 中度延迟 |
| 延迟 4-7 天 | 45-59 分 | 严重延迟 |
| 延迟>7 天 | 30 分 | 不及格 |

### 2. 条件必填规则

得分 **< 80 分** 时，以下字段必填：
- ✅ 学习收获
- ✅ 延迟原因
- ✅ 反思改进
- ✅ 归因分类

### 3. 页面功能

| 页面 | 功能 |
|-----|------|
| 首页 | 任务列表、状态筛选、加载更多 |
| 创建页 | 新建任务、设置优先级和截止日期 |
| 详情页 | 查看任务、更新状态、查看评分 |
| 我的 | 用户信息、环境 ID、AppID |

---

## 🛠️ 常见问题

### Q1: 云函数上传失败？
```
A: 检查以下几点：
1. 每个云函数目录下必须有 package.json 和 index.js
2. 右键选择「上传并部署：云端安装依赖」
3. 检查云开发环境 ID 是否正确
```

### Q2: 调用云函数报错？
```
A: 检查以下几点：
1. app.js 中云开发初始化是否正确
2. 环境 ID 是否匹配（cloud1-3g7j95ax4a0f4a3f）
3. 查看云开发控制台的云函数日志
```

### Q3: 数据库读写失败？
```
A: 检查数据库权限设置：
1. 进入云开发控制台 → 数据库
2. 检查集合权限是否为「所有用户可读写」
3. 或者设置自定义权限规则
```

---

## 📱 下一步优化

- [ ] 添加任务编辑功能
- [ ] 添加任务删除功能
- [ ] 完善复盘表单（得分<80 时强制填写）
- [ ] 添加周报查看页面
- [ ] 添加数据统计图表
- [ ] 添加消息通知功能

---

## 📞 技术支持

有问题随时联系老 K。

**🎉 事绩通 v1.0.0 部署完成！**
