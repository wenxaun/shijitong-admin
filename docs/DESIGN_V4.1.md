# 事绩通 v4.1.0 - 清单模式 + UI 升级

**版本**: v4.1.0  
**开发日期**: 2026-03-26  
**参考**: 飞书任务系统

---

## 📋 需求概述

### 核心变更
1. **新增轻量清单 (Checklist)** - 快速检查项，无独立属性
2. **详情页 UI 重构** - Tab 式布局，参考飞书
3. **子任务模块优化** - 卡片式展示，批量操作

### 保留功能
- ✅ 重量级子任务（复杂项目，独立属性）
- ✅ 任务流转功能
- ✅ 进度联动

---

## 🗄️ 数据库设计

### tasks 表新增字段

```json
{
  "_id": "task_xxx",
  "task_name": "主任务",
  
  // 新增：轻量清单
  "checklist": [
    {
      "id": "item_1",
      "title": "检查项标题",
      "completed": false,
      "completed_by": "openid_xxx",
      "completed_at": null,
      "created_at": 1711440000000,
      "order": 0
    }
  ],
  
  // 新增：评论
  "comments": [
    {
      "id": "comment_1",
      "user_id": "openid_xxx",
      "user_name": "张三",
      "avatar_url": "https://...",
      "content": "评论内容",
      "created_at": 1711440000000,
      "parent_id": null  // 支持回复评论
    }
  ],
  
  // 新增：附件
  "attachments": [
    {
      "id": "file_1",
      "name": "文件名.pdf",
      "url": "cloud://...",
      "type": "file",  // file | image
      "size": 102400,
      "uploaded_by": "openid_xxx",
      "uploaded_at": 1711440000000
    }
  ],
  
  // 新增：完成备注
  "completion_note": {
    "content": "完成总结",
    "by": "openid_xxx",
    "at": 1711440000000
  }
}
```

---

## ☁️ 云函数设计

### 新增云函数（5 个）

| 名称 | 功能 | 输入 | 输出 |
|------|------|------|------|
| checklist-add | 添加清单项 | task_id, title | success |
| checklist-update | 更新清单项（勾选） | task_id, item_id, completed | success |
| checklist-delete | 删除清单项 | task_id, item_id | success |
| comment-add | 添加评论 | task_id, content, parent_id | comment |
| comment-list | 获取评论列表 | task_id, limit | comments[] |

### 修改云函数（2 个）

| 名称 | 修改内容 |
|------|----------|
| task-update | 新增 completion_note 字段支持 |
| task-get | 返回 checklist/comments/attachments |

---

## 📱 小程序页面

### 1. pages/detail 详情页重构

**新布局**：
```
┌─────────────────────────────────────┐
│ ← 返回    任务详情    ✓完成 │ 顶部栏
├─────────────────────────────────────┤
│ [标题] 重要紧急                        │ 标题区
│ 📅 3 月 30 日  👤 张三  🏷️ 高优先级      │ 元数据
├─────────────────────────────────────┤
│ [描述内容...]                        │ 描述
├─────────────────────────────────────┤
│ Tab: 详情 | 子任务 (3) | 清单 (5) | 评论 │ Tab 栏
├─────────────────────────────────────┤
│                                     │
│  [内容区 - 根据 Tab 切换]              │
│                                     │
├─────────────────────────────────────┤
│ [输入框：添加评论...]                 │ 底部输入
└─────────────────────────────────────┘
```

### 2. 新增页面

| 页面 | 功能 |
|------|------|
| pages/checklist-manage | 清单管理（可选，简单场景直接在详情页操作） |
| pages/attachment-view | 附件查看/上传 |

---

## 🎨 UI 设计规范

### 颜色
- 主色：#1377EB（飞书蓝）
- 成功：#00B365
- 警告：#FF8800
- 危险：#FF5252
- 文字：#333333 / #666666 / #999999

### 间距
- 页面边距：24rpx
- 卡片间距：16rpx
- 元素间距：12rpx

### 组件
- 卡片圆角：16rpx
- 按钮高度：80rpx
- 输入框高度：72rpx
- Tab 高度：88rpx

---

## 📊 开发任务分解

### Phase 1 - 数据库 + 云函数（2 小时）
- [ ] 设计文档评审
- [ ] 创建云函数：checklist-add/update/delete
- [ ] 创建云函数：comment-add/list
- [ ] 修改 task-get 返回新字段

### Phase 2 - 详情页重构（3 小时）
- [ ] 新建 detail 页面 Tab 组件
- [ ] 清单模块 UI + 交互
- [ ] 评论模块 UI + 交互
- [ ] 完成备注功能

### Phase 3 - 测试 + 优化（1 小时）
- [ ] 功能测试
- [ ] 性能优化（评论分页）
- [ ] UI 细节调整
- [ ] 文档更新

---

## 🚀 部署步骤

1. 上传 5 个新增云函数
2. 编译小程序测试
3. 真机测试（清单/评论/完成备注）
4. 灰度发布

---

## 📝 验收标准

- [ ] 清单项可快速添加/勾选/删除
- [ ] 评论可添加/查看/回复
- [ ] 完成备注在完成任务时弹出
- [ ] Tab 切换流畅
- [ ] UI 与飞书风格一致

---

_事绩通 v4.1.0 - 飞书风格升级_
