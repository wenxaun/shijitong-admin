// pages/subtask-create/subtask-create.js
const app = getApp()

Page({
  data: {
    parentTaskId: '',
    taskName: '',
    taskDescription: '',
    executorList: [],
    executorIndex: -1,
    executorName: '',
    requireDate: '',
    minDate: '',
    maxDate: '',
    priority: 'P2'
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ parentTaskId: options.id })
      
      // 设置日期范围
      const today = new Date()
      const minDate = this.formatDate(today)
      
      // 获取主任务的截止日期作为最大值
      this.loadParentTaskDeadline()
      
      this.setData({ minDate })
    }
    
    // 加载团队成员
    this.loadTeamMembers()
  },

  // 加载主任务截止日期
  loadParentTaskDeadline: function () {
    const that = this
    const db = wx.cloud.database()
    
    db.collection('tasks').doc(this.data.parentTaskId).get().then(res => {
      if (res.data && res.data.require_date) {
        that.setData({
          maxDate: res.data.require_date
        })
      }
    })
  },

  // 加载团队成员
  loadTeamMembers: function () {
    const that = this
    const db = wx.cloud.database()
    
    db.collection('users').where({
      openid: app.globalData.openid
    }).get().then(userRes => {
      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        
        if (user.organization_id) {
          db.collection('users').where({
            organization_id: user.organization_id
          }).field({
            openid: true,
            nickname: true
          }).get().then(membersRes => {
            that.setData({
              executorList: membersRes.data,
              executorIndex: 0,
              executorName: membersRes.data[0].nickname
            })
          })
        } else {
          that.setData({
            executorList: [{
              openid: app.globalData.openid,
              nickname: '我'
            }],
            executorIndex: 0,
            executorName: '我'
          })
        }
      }
    })
  },

  // 任务名称输入
  onTaskNameInput: function (e) {
    this.setData({ taskName: e.detail.value })
  },

  // 描述输入
  onDescriptionInput: function (e) {
    this.setData({ taskDescription: e.detail.value })
  },

  // 选择负责人
  selectExecutor: function () {
    const that = this
    const executorList = this.data.executorList
    
    if (executorList.length === 0) {
      wx.showToast({ title: '无可选成员', icon: 'none' })
      return
    }
    
    wx.showActionSheet({
      itemList: executorList.map(u => u.nickname),
      success: (res) => {
        that.setData({
          executorIndex: res.tapIndex,
          executorName: executorList[res.tapIndex].nickname
        })
      }
    })
  },

  // 日期选择
  onDateChange: function (e) {
    this.setData({ requireDate: e.detail.value })
  },

  // 优先级选择
  setPriority: function (e) {
    this.setData({ priority: e.currentTarget.dataset.value })
  },

  // 创建子任务
  createSubtask: function () {
    // 验证必填字段
    if (!this.data.taskName.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }

    if (!this.data.requireDate) {
      wx.showToast({ title: '请选择截止日期', icon: 'none' })
      return
    }

    const executor = this.data.executorList[this.data.executorIndex]

    wx.showLoading({ title: '创建中...' })

    wx.cloud.callFunction({
      name: 'subtask-create',
      data: {
        task_id: this.data.parentTaskId,
        title: this.data.taskName,
        description: this.data.taskDescription,
        executor_id: executor.openid,
        require_date: this.data.requireDate,
        priority: this.data.priority
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('创建子任务失败:', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    })
  },

  // 格式化日期
  formatDate: function (date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
})
