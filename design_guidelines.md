# 事绩通 - 设计指南

## 品牌定位

- **应用名称**：事绩通
- **应用类型**：任务管理 / 团队协作
- **设计风格**：飞书风格（简洁、专业、高效）
- **目标用户**：企业团队、项目管理者

---

## 配色方案

### 主色板

| 用途 | 色值 | Tailwind 类名 |
|------|------|---------------|
| 主色（品牌蓝） | #1377EB | `bg-blue-500` / `text-blue-500` |
| 主色深 | #0F64D2 | `bg-blue-600` |
| 主色浅 | #E8F0FE | `bg-blue-50` |

### 中性色

| 用途 | 色值 | Tailwind 类名 |
|------|------|---------------|
| 背景色 | #F5F7FA | `bg-gray-50` |
| 卡片背景 | #FFFFFF | `bg-white` |
| 边框色 | #E5E6EB | `border-gray-200` |
| 主要文字 | #333333 | `text-gray-800` |
| 次要文字 | #666666 | `text-gray-600` |
| 辅助文字 | #999999 | `text-gray-400` |

### 语义色

| 用途 | 色值 | Tailwind 类名 |
|------|------|---------------|
| 成功 | #00B365 | `text-green-500` / `bg-green-50` |
| 警告 | #FF7D27 | `text-orange-500` / `bg-orange-50` |
| 错误 | #EA4335 | `text-red-500` / `bg-red-50` |

### 优先级配色

| 优先级 | 颜色 | Tailwind 类名 |
|--------|------|---------------|
| P0（紧急） | 红色 | `bg-red-50 text-red-500` |
| P1（高） | 橙色 | `bg-orange-50 text-orange-500` |
| P2（中） | 蓝色 | `bg-blue-50 text-blue-500` |
| P3（低） | 灰色 | `bg-gray-50 text-gray-400` |

---

## 🔥 统一交互规范（CRITICAL）

### 一、加载状态

所有页面必须使用统一的加载状态组件：

```tsx
// 1. 骨架屏加载（首屏）
import { Skeleton } from '@/components/ui/skeleton';

<Card>
  <CardContent className="p-3">
    <Skeleton className="h-6 w-3/4 mb-3" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-1/2" />
  </CardContent>
</Card>

// 2. 局部加载遮罩（刷新时）
{loading && hasData && (
  <View className="fixed inset-0 flex items-center justify-center z-50 bg-black/20">
    <View className="bg-white rounded-xl px-6 py-4 flex items-center gap-2 shadow-lg">
      <Loader size={20} color="#1377EB" className="animate-spin" />
      <Text className="text-gray-600">加载中...</Text>
    </View>
  </View>
)}

// 3. 下拉刷新（列表页）
<ScrollView refresherEnabled refresherTriggered={refreshing} onRefresherRefresh={onRefresh}>
  {/* 内容 */}
</ScrollView>
```

### 二、空状态

所有列表页面必须使用统一的空状态组件：

```tsx
import { EmptyState } from '@/components/empty-state';
import { ClipboardList } from 'lucide-react-taro';

// 无数据时
<EmptyState 
  icon={ClipboardList}
  title="暂无任务"
  description="点击右下角按钮创建新任务"
  actionText="创建任务"
  onAction={() => Taro.navigateTo({ url: '/pages/create/index' })}
/>
```

### 三、筛选组件

所有筛选必须使用统一的 Tabs 组件：

```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs value={filter} onValueChange={setFilter}>
  <TabsList>
    <TabsTrigger value="all">全部</TabsTrigger>
    <TabsTrigger value="pending">待办</TabsTrigger>
    <TabsTrigger value="in_progress">进行中</TabsTrigger>
    <TabsTrigger value="completed">已完成</TabsTrigger>
  </TabsList>
</Tabs>
```

### 四、页面过渡动画

所有页面切换必须使用统一的过渡效果：

```tsx
// 1. 卡片进入动画（CSS）
.task-card {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 2. 列表项交错进入
{tasks.map((task, index) => (
  <View 
    key={task._id} 
    className="task-card"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    {/* 任务卡片 */}
  </View>
))}
```

### 五、Toast 提示

统一使用 Taro.showToast：

```tsx
// 成功提示
Taro.showToast({ title: '操作成功', icon: 'success' });

// 错误提示
Taro.showToast({ title: '操作失败', icon: 'error' });

// 普通提示
Taro.showToast({ title: '请稍后重试', icon: 'none' });
```

### 六、确认弹窗

统一使用 Taro.showModal：

```tsx
Taro.showModal({
  title: '确认删除',
  content: '删除后无法恢复，确定删除吗？',
  confirmColor: '#EA4335',
  success: (res) => {
    if (res.confirm) {
      // 确认操作
    }
  }
});
```

---

## 组件使用原则

### 通用 UI 组件

以下组件优先从 `@/components/ui/*` 导入，禁止用 View/Text 手搓：

- **Button**：主按钮、次按钮、幽灵按钮
- **Input / Textarea**：表单输入
- **Card**：任务卡片、信息卡片
- **Badge**：优先级标签、状态标签
- **Tabs**：状态筛选、时间筛选
- **Dialog / AlertDialog**：确认弹窗
- **Toast / Sonner**：提示消息
- **Skeleton**：加载骨架屏
- **Progress**：进度条

### 页面组件选型

每个页面开发前，先拆分 UI 单元并映射到组件库：

1. **任务列表页**：Card（任务卡片）、Badge（状态/优先级）、Tabs（筛选）
2. **创建任务页**：Input、Textarea、Select、Button
3. **任务详情页**：Card、Badge、Progress、Button
4. **个人中心页**：Avatar、Card、List

---

## 间距系统

| 用途 | 值 | Tailwind 类名 |
|------|-----|---------------|
| 页面边距 | 12px | `p-3` |
| 卡片内边距 | 8px | `p-2` |
| 组件间距 | 6px | `gap-1.5` |
| 小间距 | 4px | `gap-1` |

---

## 导航结构

### TabBar 配置

```typescript
tabBar: {
  color: '#666666',
  selectedColor: '#1377EB',
  list: [
    { pagePath: 'pages/index/index', text: '任务' },
    { pagePath: 'pages/create/create', text: '发布' },
    { pagePath: 'pages/profile/profile', text: '我的' }
  ]
}
```

### 页面列表（共 24 个）

| 分类 | 页面 |
|------|------|
| 核心 | index（任务列表）、create（创建）、detail（详情）、edit（编辑） |
| 用户 | splash（启动页）、login（登录）、register（注册）、profile（我的） |
| 复盘 | review（复盘）、history（历史）、stats（统计）、weekly（周报） |
| 子任务 | subtask-create、subtask-detail、subtask-edit、subtask-flow、subtask-manage |
| 团队 | team、team-edit、team-manage、dept-manage、org-create |
| 其他 | exception（异常上报）、settings（设置） |

---

## 状态展示

### 任务状态

| 状态 | 显示文字 | 颜色 |
|------|---------|------|
| pending | 待办 | 灰色 |
| in_progress | 进行中 | 蓝色 |
| completed | 已完成 | 绿色 |
| cancelled | 已取消 | 红色 |

### 评分等级

| 分数 | 等级 | 颜色 |
|------|------|------|
| 100 | 提前完成 | 绿色 |
| 80 | 按时完成 | 蓝色 |
| 60-79 | 轻微延迟 | 橙色 |
| 45-59 | 严重延迟 | 橙红 |
| 30 | 不及格 | 红色 |

---

## 小程序约束

1. **包体积**：主包 < 2MB，使用分包加载
2. **图片**：使用 CDN 或云存储，避免本地大图
3. **云函数**：使用微信云开发，环境 ID: `cloud1-3g7j95ax4a0f4a3f`
4. **数据库**：tasks、users、reviews、teams、departments、organizations
