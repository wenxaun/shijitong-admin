# 🎨 UI 设计指南 - 飞书风格

**版本：** v2.0  
**更新时间：** 2026-03-24  
**参考：** 飞书任务系统

---

## 📋 设计原则

1. **简洁高效** - 减少视觉干扰，聚焦核心内容
2. **清晰层级** - 通过色彩、大小、间距建立信息层次
3. **流畅交互** - 平滑动画、明确反馈、自然过渡
4. **一致体验** - 统一的设计语言和交互模式

---

## 🎨 配色系统

### 主色调

```css
--feishu-blue: #1377EB        /* 飞书蓝 - 主色 */
--feishu-blue-dark: #0F64D2   /* 深色 - 按压态 */
--feishu-blue-light: #E8F0FE  /* 浅色 - 背景/高亮 */
```

### 中性色

```css
/* 背景色 */
--bg-primary: #FFFFFF         /* 主背景 */
--bg-secondary: #F5F7FA       /* 次级背景 */
--bg-tertiary: #EFF1F5        /* 第三级背景 */

/* 文字色 */
--text-primary: #1F2329       /* 主文字 */
--text-secondary: #646A73     /* 次级文字 */
--text-tertiary: #8F959E      /* 辅助文字 */

/* 边框色 */
--border-color: #DEE0E3       /* 边框 */
--border-light: #EFF1F5       /* 轻边框 */
```

### 功能色

```css
--success: #00B365            /* 成功 - 绿色 */
--warning: #FF7D27            /* 警告 - 橙色 */
--error: #EA4335              /* 错误 - 红色 */
```

---

## 📐 尺寸规范

### 圆角

```css
--radius-sm: 8rpx             /* 小圆角 - 标签/按钮 */
--radius-md: 12rpx            /* 中圆角 - 卡片 */
--radius-lg: 16rpx            /* 大圆角 - 弹窗 */
--radius-xl: 24rpx            /* 超大圆角 - 特殊场景 */
```

### 阴影

```css
--shadow-sm: 0 1rpx 4rpx rgba(0,0,0,0.05)     /* 轻阴影 */
--shadow-md: 0 2rpx 8rpx rgba(0,0,0,0.08)     /* 中阴影 */
--shadow-lg: 0 4rpx 16rpx rgba(0,0,0,0.12)    /* 重阴影 */
```

### 间距

```
4rpx    - 极小间距
8rpx    - 小间距
12rpx   - 中小间距
16rpx   - 中间距
20rpx   - 中大间距
24rpx   - 大间距
32rpx   - 超大间距
40rpx   - 特大间距
```

---

## ✨ 动画规范

### 过渡时间

```css
--transition-fast: 150ms ease     /* 快速过渡 - 小元素 */
--transition-normal: 200ms ease   /* 正常过渡 - 常规元素 */
--transition-slow: 300ms ease     /* 慢速过渡 - 大元素/页面 */
```

### 常用动画

```css
/* 淡入 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* 滑入 */
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/* 脉冲 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 🖱️ 交互反馈

### 按钮点击

```css
.btn-primary {
  background: linear-gradient(135deg, #1377EB, #2B85E4);
  transition: all 150ms ease;
}

.btn-primary:active {
  transform: scale(0.96);
  background: linear-gradient(135deg, #0F64D2, #1E73D8);
}
```

### 卡片点击

```css
.card {
  transition: box-shadow 200ms ease, background 200ms ease;
}

.card:active {
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
  background: #F5F7FA;
}
```

### 列表项点击

```css
.list-item {
  transition: background 150ms ease;
}

.list-item:active {
  background: #EFF1F5;
}
```

---

## 📱 组件规范

### 按钮

| 类型 | 场景 | 样式 |
|------|------|------|
| **Primary** | 主要操作 | 飞书蓝渐变，白字 |
| **Secondary** | 次要操作 | 浅灰背景，黑字 |
| **Ghost** | 无框操作 | 透明背景，蓝字 |
| **Danger** | 危险操作 | 红色边框，红字 |

### 标签

| 类型 | 场景 | 样式 |
|------|------|------|
| **Primary** | 主要标签 | 蓝底浅蓝边 |
| **Success** | 成功状态 | 绿底浅绿边 |
| **Warning** | 警告状态 | 橙底浅橙边 |
| **Error** | 错误状态 | 红底浅红边 |
| **Default** | 默认标签 | 灰底灰边 |

### 表单

```css
/* 输入框 */
.form-input {
  height: 96rpx;
  background: #F5F7FA;
  border-radius: 12rpx;
  padding: 0 28rpx;
  transition: all 150ms ease;
}

.form-input:focus {
  background: #FFFFFF;
  border-color: #1377EB;
  box-shadow: 0 0 0 4rpx #E8F0FE;
}
```

### 卡片

```css
.card {
  background: #FFFFFF;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.05);
}
```

---

## 🎯 优先级色彩

| 优先级 | 背景色 | 文字色 | 使用场景 |
|--------|--------|--------|----------|
| **P0** | #FFECE8 | #EA4335 | 紧急重要 |
| **P1** | #FFF3E6 | #FF7D27 | 重要 |
| **P2** | #E8F0FE | #1377EB | 普通 |
| **P3** | #EFF1F5 | #8F959E | 低优先级 |

---

## 📊 任务状态色彩

| 状态 | 背景色 | 文字色 | 左侧条 |
|------|--------|--------|--------|
| **待办** | #E8F0FE | #1377EB | #1377EB |
| **进行中** | #FFF3E6 | #FF7D27 | #FF7D27 |
| **已完成** | #E6F7EF | #00B365 | #00B365 |
| **已取消** | #EFF1F5 | #8F959E | #8F959E |

---

## 📐 布局规范

### 页面结构

```
Page
├── Navigation Bar (44px)
├── Content Area
│   ├── Header Section (可选)
│   ├── Filter/Toolbar (可选)
│   ├── List/Grid Content
│   └── Empty State (无数据时)
└── Tab Bar (50px + safe area)
```

### 列表项

```
List Item (min-height: 88rpx)
├── Left Icon/Avatar (48x48rpx)
├── Content
│   ├── Title (30rpx, 600)
│   └── Description (26rpx, 400)
└── Right Action/Arrow
```

### 卡片

```
Card
├── Header (可选)
├── Content
│   ├── Title
│   ├── Description
│   └── Metadata
└── Footer/Actions (可选)
```

---

## 🎭 空状态

```css
.empty-state {
  padding: 120rpx 40rpx;
  text-align: center;
}

.empty-state-icon {
  font-size: 120rpx;
  opacity: 0.3;
  margin-bottom: 24rpx;
}

.empty-state-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.empty-state-desc {
  font-size: 28rpx;
  color: #646A73;
  line-height: 1.6;
}
```

---

## 📱 适配规范

### 安全区域

```css
/* 顶部安全区 */
padding-top: constant(safe-area-inset-top);
padding-top: env(safe-area-inset-top);

/* 底部安全区 */
padding-bottom: constant(safe-area-inset-bottom);
padding-bottom: env(safe-area-inset-bottom);
```

### 最小点击区域

```
按钮/可点击元素最小尺寸：88rpx x 88rpx
列表项最小高度：88rpx
表单输入框最小高度：88rpx
```

---

## ✅ 检查清单

### 视觉检查

- [ ] 配色符合飞书规范
- [ ] 圆角统一（12rpx 为主）
- [ ] 阴影层次清晰
- [ ] 文字层级分明
- [ ] 间距一致

### 交互检查

- [ ] 按钮有按压反馈
- [ ] 列表项有点击态
- [ ] 输入框有聚焦效果
- [ ] 动画流畅（200ms）
- [ ] 加载状态明确

### 适配检查

- [ ] 适配 iPhone SE (小屏)
- [ ] 适配 iPhone 14 Pro Max (大屏)
- [ ] 适配刘海屏/灵动岛
- [ ] 底部安全区域正确

---

## 📚 参考资源

- **飞书设计系统:** https://design.feishu.cn/
- **微信小程序设计指南:** https://developers.weixin.qq.com/miniprogram/design/
- **iOS Human Interface Guidelines:** https://developer.apple.com/design/

---

_事绩通 v2.0 - 飞书风格，专业高效_
