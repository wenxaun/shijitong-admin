# 事绩通 v5.0.9 - Bug 修复报告

**修复时间:** 2026-03-26 11:05  
**版本:** v5.0.9  
**优先级:** P1 Bug 修复

---

## 🐛 修复的问题

### 问题 1: WXML 无法调用 JS 函数 🔴

**文件:** `miniprogram/pages/detail/detail.wxml`  
**问题:** `{{formatDateTime(comment.created_at)}}` 在 WXML 中无法调用 JS 函数  
**影响:** 评论时间显示为空白或报错  
**修复:** 改为 `{{comment.timeText}}`，在 JS 中预计算

---

### 问题 2: 评论列表缺少 timeText 字段 🟡

**文件:** `miniprogram/pages/detail/detail.js`  
**问题:** `loadComments` 和 `addComment` 时未预计算 `timeText`  
**影响:** 评论时间无法显示  
**修复:** 
- `loadComments`: 加载评论时 map 预计算 `timeText`
- `addComment`: 添加评论时预计算 `timeText`

---

## ✅ 修复方案

### 修复前

**detail.wxml:**
```xml
<text class="comment-time">{{formatDateTime(comment.created_at)}}</text>
```

**detail.js:**
```javascript
loadComments: function () {
  wx.cloud.callFunction({
    name: 'comment-list',
    data: { task_id: this.data.taskId, limit: 50 }
  }).then(res => {
    if (res.result.success) {
      that.setData({ comments: res.result.comments })  // ❌ 未预计算 timeText
    }
  })
}
```

---

### 修复后

**detail.wxml:**
```xml
<text class="comment-time">{{comment.timeText}}</text>
```

**detail.js:**
```javascript
loadComments: function () {
  wx.cloud.callFunction({
    name: 'comment-list',
    data: { task_id: this.data.taskId, limit: 50 }
  }).then(res => {
    if (res.result.success) {
      // ✅ 预计算 timeText
      const comments = res.result.comments.map(c => ({
        ...c,
        timeText: this.formatDateTime(c.created_at)
      }))
      that.setData({ comments: comments })
    }
  })
},

addComment: function () {
  // ...
  wx.cloud.callFunction({
    name: 'comment-add',
    data: { task_id: this.data.taskId, content: content }
  }).then(res => {
    if (res.result.success) {
      // ✅ 预计算 timeText
      const newComment = {
        ...res.result.comment,
        timeText: that.formatDateTime(res.result.comment.created_at)
      }
      that.setData({
        commentInput: '',
        comments: [newComment, ...that.data.comments]
      })
    }
  })
}
```

---

## 📋 其他问题说明

### 问题 3: notify.wxml 和 notify.js ❌

**状态:** 文件不存在  
**说明:** 项目中未找到 `notify` 相关页面，可能是历史版本或已删除  
**建议:** 如需要通知功能，使用 `feishu-notify` 云函数

---

### 问题 4: create.js 重复 Page({}) ❌

**状态:** 未发现问题  
**检查结果:**
```bash
$ grep -n "Page({" miniprogram/pages/create/create.js
4:Page({
```
**说明:** 只有一个 `Page({})` 定义，位于第 4 行，文件末尾无重复  
**建议:** 可能是旧版本问题，当前版本已修复

---

## 🧪 测试建议

### 评论功能测试

**测试步骤:**
1. 打开任意任务详情页
2. 切换到「评论」Tab
3. 查看现有评论的时间显示
4. 添加一条新评论
5. 检查新评论的时间显示

**预期结果:**
- ✅ 所有评论显示格式化时间（如：2026-03-26 11:05）
- ✅ 新添加的评论立即显示时间
- ✅ 无报错、无空白

---

## 📊 Git 提交记录

```
970153f fix(v5.0.9): 修复 WXML 调用 JS 函数问题
fe16197 docs: 添加 v5.0.8 测试指南
abc4bd7 feat(v5.0.8): 补充缺失云函数 - P0 高危修复
```

---

## 🚀 部署步骤

**微信开发者工具:**
1. 编译小程序
2. 检查无错误
3. 上传代码（如需发布）

---

## 📝 技术总结

### WXML 限制

**规则:** WXML 中不能直接调用 JS 函数  
**原因:** WXML 是模板语言，不支持函数调用  
**解决方案:**
1. 在 JS 中预计算好数据
2. setData 时传入模板
3. WXML 直接显示字段

### 最佳实践

```javascript
// ❌ 错误：WXML 调用函数
<text>{{formatDate(timestamp)}}</text>

// ✅ 正确：JS 预计算
// JS
const item = {
  ...data,
  timeText: this.formatDate(timestamp)
}
this.setData({ item })

// WXML
<text>{{item.timeText}}</text>
```

---

**修复完成时间:** 2026-03-26 11:05  
**测试状态:** ⏳ 待测试  
**上线状态:** ⏳ 待部署

---

_事绩通 v5.0.9 - 评论时间显示修复_
