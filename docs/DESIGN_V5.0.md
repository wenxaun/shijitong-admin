# 事绩通 v5.0.0 - 子任务与清单重构

**版本**: v5.0.0  
**日期**: 2026-03-26  
**参考**: 飞书任务系统设计

---

## 🎯 重构目标

### 问题
- ❌ 当前子任务过于重量级（支持流转等复杂功能）
- ❌ 清单从属关系错误（挂在主任务下）
- ❌ 缺少进度自动聚合

### 目标
- ✅ 子任务轻量化（一级分解，不可嵌套）
- ✅ 清单属于子任务（检查项）
- ✅ 进度自动计算聚合

---

## 🗄️ 数据库设计

### tasks 表（主任务）- 新增字段

```json
{
  "_id": "task_xxx",
  "task_name": "主任务",
  "status": "pending/in_progress/completed/cancelled",
  "progress": 0,  // 新增：自动计算的进度 0-100
  "subtask_count": 0,  // 已有：子任务总数
  "completed_subtask_count": 0,  // 已有：已完成数
  // ... 其他字段
}
```

### subtasks 表（子任务）- 新建

```json
{
  "_id": "subtask_xxx",
  "task_id": "主任务 ID",  // 关联主任务
  "title": "子任务标题",
  "description": "描述（可选）",
  "executor_id": "负责人 openid",
  "require_date": "截止日期",
  "status": "pending/in_progress/completed/cancelled",
  "progress": 0,  // 0-100，手动或自动
  "checklist": [  // 清单属于子任务
    {
      "id": "item_1",
      "title": "检查项",
      "completed": false,
      "completed_by": "openid",
      "completed_at": null
    }
  ],
  "order": 0,  // 排序
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

**关键规则**：
- 子任务不能有子任务（一级限制）
- 清单只在子任务详情页管理
- 主任务进度自动聚合

---

## ☁️ 云函数设计

### 新增云函数（3 个）

| 名称 | 功能 | 触发时机 |
|------|------|----------|
| subtask-create | 创建子任务 | 手动 |
| subtask-update | 更新子任务（含清单） | 手动 |
| subtask-delete | 删除子任务 | 手动 |
| task-calc-progress | 计算主任务进度 | 子任务变更时自动调用 |

### 修改云函数（1 个）

| 名称 | 修改内容 |
|------|----------|
| task-get | 返回 progress 字段 |
| task-update | 支持 progress 字段 |

---

## 📱 页面设计

### 页面结构

```
pages/detail（主任务详情）
├── 任务信息卡片
├── Tab: 详情 | 子任务 | 评论
│
└── pages/subtask-detail（子任务详情）← 新增
    ├── 子任务信息
    ├── 清单管理
    └── 返回主任务
```

### 子任务管理页（简化）

```
pages/subtask-manage
├── 子任务列表（卡片式）
├── 添加子任务按钮
└── 点击进入子任务详情
```

---

## 🎨 UI 规范（飞书风格）

### 子任务卡片

```
┌─────────────────────────────────┐
│ ✓ [高] 完成代码审查             │
│   负责人：张三  截止：03-25     │
│   进度：100% ▓▓▓▓▓▓▓▓▓▓        │
└─────────────────────────────────┘

状态色：
- pending: 灰色 #999999
- in_progress: 蓝色 #1377EB
- completed: 绿色 #00B365
- cancelled: 红色 #FF5252

优先级色：
- P0: 红色 #FF5252
- P1: 橙色 #FF8800
- P2: 蓝色 #1377EB
- P3: 灰色 #999999
```

### 清单项

```
☐ 检查项标题  ← 未勾选
☑ 检查项标题  ← 已勾选（灰色删除线）
```

---

## 📊 进度聚合逻辑

### 场景 1: 仅有子任务

```
主任务进度 = completed_subtask_count / subtask_count × 100
```

### 场景 2: 子任务包含清单

```
子任务进度 = 已完成清单项 / 总清单项 × 100
主任务进度 = 所有子任务进度平均值
```

### 触发时机

```
子任务创建 → 更新主任务 subtask_count → 重新计算进度
子任务完成 → 更新 completed_subtask_count → 重新计算进度
子任务删除 → 更新计数 → 重新计算进度
清单勾选 → 更新子任务进度 → 重新计算主任务进度
```

---

## 📋 开发任务

### Phase 1: 清理（30 分钟）
- [ ] 删除 checklist 相关云函数（checklist-add/update/delete）
- [ ] 删除 detail 页面的清单 Tab
- [ ] 简化子任务逻辑（去掉流转）

### Phase 2: 数据库（30 分钟）
- [ ] 创建 subtasks 表
- [ ] tasks 表添加 progress 字段

### Phase 3: 云函数（1 小时）
- [ ] subtask-create
- [ ] subtask-update
- [ ] subtask-delete
- [ ] task-calc-progress

### Phase 4: 页面（1 小时）
- [ ] pages/subtask-detail（新增）
- [ ] pages/subtask-manage（重构）
- [ ] pages/detail（优化子任务 Tab）

### Phase 5: 现有页面优化（30 分钟）
- [ ] pages/index（列表页）- 显示进度条
- [ ] pages/create（创建页）- 优化表单
- [ ] pages/edit（编辑页）- 优化表单

---

## ✅ 验收标准

- [ ] 子任务一级分解（不可嵌套）
- [ ] 清单属于子任务
- [ ] 进度自动聚合
- [ ] UI 对齐飞书风格
- [ ] 现有页面无明显缺陷

---

_事绩通 v5.0.0 - 子任务与清单重构_
