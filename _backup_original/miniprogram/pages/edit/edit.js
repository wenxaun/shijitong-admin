// pages/edit/edit.js
const app = getApp()

Page({
  data: {
    taskId: '',
    taskName: '',
    taskDescription: '',
    priority: 'P1',
    category: '',
    executorList: [],
    executorIndex: -1,
    requireDate: '',
    publisherOpenid: '',
    
    // 复盘字段
    isOverdue: false,
    learnings: '',
    delayReason: '',
    improvements: '',
    attributionTags: [],
    attributionOptions: ['时间预估不足', '需求变更', '资源不足', '技术难点', '沟通问题', '其他'],
    completionNote: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ taskId: options.id })
      // 如果有 completionNote，说明是从复盘弹窗跳转过来的
      if (options.completionNote) {
        this.setData({ completionNote: decodeURIComponent(options.completionNote) })
      }
      this.loadTask()
      this.loadExecutorList()
    }
  },

  // 加载任务详情
  loadTask: function () {
    wx.showLoading({ title: '加载中...' })

    const db = wx.cloud.database()
    db.collection('tasks').doc(this.data.taskId).get().then(res => {
      wx.hideLoading()
      const task = res.data
      
      // 检查权限（发布人或执行人可编辑）
      const currentOpenid = app.globalData.openid
      const isPublisher = (task.publisher_id === currentOpenid)
      const isExecutor = (task.executor_id === currentOpenid)
      
      if (!isPublisher && !isExecutor) {
        wx.showToast({ title: '无权限编辑', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      // 检查是否逾期
      const isOverdue = task.require_date && new Date(task.require_date) < new Date() && task.status !== 'completed'
      
      // 填充数据
      this.setData({
        taskName: task.task_name,
        taskDescription: task.task_description || '',
        priority: task.priority,
        category: task.category || '',
        requireDate: task.require_date,
        publisherOpenid: task.publisher_id,
        isOverdue: isOverdue,
        // 加载已有的复盘字段
        learnings: task.learnings || '',
        delayReason: task.delay_reason || '',
        improvements: task.improvements || '',
        attributionTags: task.attribution_tags || []
      })

      // 查找执行人索引
      if (task.executor_id && this.data.executorList.length > 0) {
        const index = this.data.executorList.findIndex(u => u.openid === task.executor_id)
        if (index >= 0) {
          this.setData({ executorIndex: index })
        }
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('加载失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 加载执行人列表
  loadExecutorList: function () {
    const db = wx.cloud.database()
    db.collection('users').orderBy('created_at', 'asc').get().then(res => {
      const users = res.data.map(u => ({
        id: u._id,
        openid: u.openid,
        name: u.nickname || '微信用户'
      }))
      this.setData({ executorList: users })
    }).catch(err => {
      console.error('加载用户列表失败:', err)
    })
  },

  onTaskNameInput: function (e) {
    this.setData({ taskName: e.detail.value })
  },

  onDescriptionInput: function (e) {
    this.setData({ taskDescription: e.detail.value })
  },

  setPriority: function (e) {
    const priority = e.currentTarget.dataset.value
    this.setData({ priority })
  },

  onCategoryInput: function (e) {
    this.setData({ category: e.detail.value })
  },

  onExecutorChange: function (e) {
    const index = e.detail.value
    this.setData({ executorIndex: index })
  },

  onDateChange: function (e) {
    this.setData({ requireDate: e.detail.value })
  },

  // 复盘字段输入
  onLearningsInput: function (e) {
    this.setData({ learnings: e.detail.value })
  },

  onDelayReasonInput: function (e) {
    this.setData({ delayReason: e.detail.value })
  },

  onImprovementsInput: function (e) {
    this.setData({ improvements: e.detail.value })
  },

  // 归因标签选择
  toggleAttribution: function (e) {
    const value = e.currentTarget.dataset.value
    const tags = this.data.attributionTags
    
    const index = tags.indexOf(value)
    if (index >= 0) {
      tags.splice(index, 1)
    } else {
      tags.push(value)
    }
    
    this.setData({ attributionTags: tags })
  },

  submitEdit: function () {
    const that = this
    
    // 验证必填字段
    if (!this.data.taskName.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }

    if (!this.data.requireDate) {
      wx.showToast({ title: '请选择要求完成日期', icon: 'none' })
      return
    }

    // 如果是逾期任务，验证复盘字段
    if (this.data.isOverdue) {
      if (!this.data.learnings.trim()) {
        wx.showToast({ title: '请填写学习收获', icon: 'none' })
        return
      }
      if (!this.data.delayReason.trim()) {
        wx.showToast({ title: '请填写延迟原因', icon: 'none' })
        return
      }
      if (!this.data.improvements.trim()) {
        wx.showToast({ title: '请填写反思改进', icon: 'none' })
        return
      }
      if (this.data.attributionTags.length === 0) {
        wx.showToast({ title: '请选择归因分类', icon: 'none' })
        return
      }
    }

    // 获取执行人 ID
    let executorId = null
    if (this.data.executorIndex >= 0) {
      executorId = this.data.executorList[this.data.executorIndex].openid
    }

    // 构建更新数据
    const updateData = {
      task_id: this.data.taskId,
      task_name: this.data.taskName.trim(),
      task_description: this.data.taskDescription.trim(),
      priority: this.data.priority,
      category: this.data.category.trim(),
      executor_id: executorId,
      require_date: this.data.requireDate
    }
    
    // 如果是逾期任务，添加复盘字段
    if (this.data.isOverdue) {
      updateData.learnings = this.data.learnings.trim()
      updateData.delay_reason = this.data.delayReason.trim()
      updateData.improvements = this.data.improvements.trim()
      updateData.attribution_tags = this.data.attributionTags
      
      // 如果有 completionNote（从复盘弹窗跳转过来的），同时提交
      if (this.data.completionNote) {
        updateData.completion_note = this.data.completionNote
        updateData.status = 'completed'
      }
    }

    // 调用云函数更新任务
    wx.showLoading({ title: '保存中...' })

    wx.cloud.callFunction({
      name: 'task-update',
      data: updateData
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('更新失败:', err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    })
  }
})
