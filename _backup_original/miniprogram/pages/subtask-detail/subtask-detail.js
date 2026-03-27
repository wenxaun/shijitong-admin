// pages/subtask-detail/subtask-detail.js - v5.0.0
const app = getApp()

Page({
  data: {
    subtaskId: '',
    subtask: null,
    loading: true,
    statusText: '',
    isOverdue: false,
    
    // 清单数据
    checklist: [],
    checklistCompletedCount: 0,
    checklistProgress: 0
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ subtaskId: options.id })
      this.loadSubtask()
    }
  },

  // 加载子任务详情
  loadSubtask: function () {
    const that = this
    wx.showLoading({ title: '加载中...' })

    const db = wx.cloud.database()
    
    // 先获取子任务数据
    db.collection('tasks').doc(this.data.subtaskId).get().then(res => {
      const subtask = res.data
      
      if (!subtask || !subtask.is_subtask) {
        wx.hideLoading()
        that.setData({ loading: false })
        wx.showToast({ title: '子任务不存在', icon: 'none' })
        return Promise.resolve(null)
      }

      // 获取负责人名称
      return db.collection('users').where({
        openid: subtask.executor_id
      }).field({ openid: true, nickname: true }).get().then(userRes => {
        return { subtask, executorName: userRes.data.length > 0 ? userRes.data[0].nickname : '未分配' }
      })
    }).then(result => {
      if (!result) return
      
      const { subtask, executorName } = result
      
      // 状态映射
      const statusTextMap = {
        'pending': '待办',
        'in_progress': '进行中',
        'completed': '已完成',
        'cancelled': '已取消'
      }

      // 检查是否逾期
      const today = new Date()
      const requireDate = new Date(subtask.require_date || Date.now())
      const isOverdue = requireDate < today && subtask.status !== 'completed'

      // 处理清单
      const checklist = subtask.checklist || []
      const completedCount = checklist.filter(i => i.completed).length
      const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

      that.setData({
        subtask: {
          ...subtask,
          executor_name: executorName
        },
        statusText: statusTextMap[subtask.status] || '待办',
        isOverdue: isOverdue,
        checklist: checklist,
        checklistCompletedCount: completedCount,
        checklistProgress: progress,
        loading: false
      })

      wx.hideLoading()
    }).catch(err => {
      console.error('加载子任务失败:', err)
      wx.hideLoading()
      that.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 完成子任务
  completeSubtask: function () {
    const that = this
    wx.showModal({
      title: '确认完成',
      content: '确定完成该子任务吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '提交中...' })
          wx.cloud.callFunction({
            name: 'subtask-update',
            data: {
              subtask_id: this.data.subtaskId,
              status: 'completed'
            }
          }).then(res => {
            wx.hideLoading()
            if (res.result.success) {
              wx.showToast({ title: '完成成功', icon: 'success' })
              that.loadSubtask()
            } else {
              wx.showToast({ title: res.result.message, icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 编辑子任务
  editSubtask: function () {
    wx.navigateTo({
      url: `/pages/edit/edit?id=${this.data.subtaskId}`
    })
  },

  // 显示添加清单项
  showAddChecklist: function () {
    const that = this
    wx.showModal({
      title: '添加检查项',
      editable: true,
      placeholderText: '请输入检查项内容',
      success: (res) => {
        if (res.confirm && res.content) {
          that.addChecklistItem(res.content)
        }
      }
    })
  },

  // 添加清单项
  addChecklistItem: function (title) {
    const that = this
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newChecklist = [...this.data.checklist, {
      id: itemId,
      title: title,
      completed: false,
      completed_at: null
    }]

    wx.cloud.callFunction({
      name: 'subtask-update',
      data: {
        subtask_id: this.data.subtaskId,
        checklist: newChecklist
      }
    }).then(res => {
      if (res.result.success) {
        const completedCount = newChecklist.filter(i => i.completed).length
        const progress = newChecklist.length > 0 ? Math.round((completedCount / newChecklist.length) * 100) : 0
        
        that.setData({
          checklist: newChecklist,
          checklistCompletedCount: completedCount,
          checklistProgress: progress
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    })
  },

  // 切换清单项完成状态
  toggleChecklistItem: function (e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.checklist.find(i => i.id === itemId)
    if (!item) return

    const that = this
    const newCompleted = !item.completed

    const newChecklist = this.data.checklist.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          completed: newCompleted,
          completed_at: newCompleted ? Date.now() : null
        }
      }
      return i
    })

    wx.cloud.callFunction({
      name: 'subtask-update',
      data: {
        subtask_id: this.data.subtaskId,
        checklist: newChecklist
      }
    }).then(res => {
      if (res.result.success) {
        const completedCount = newChecklist.filter(i => i.completed).length
        const progress = newChecklist.length > 0 ? Math.round((completedCount / newChecklist.length) * 100) : 0
        
        that.setData({
          checklist: newChecklist,
          checklistCompletedCount: completedCount,
          checklistProgress: progress
        })
      }
    })
  },

  // 删除清单项
  deleteChecklistItem: function (e) {
    const itemId = e.currentTarget.dataset.id
    const that = this

    wx.showModal({
      title: '确认删除',
      content: '确定删除该检查项吗？',
      success: (res) => {
        if (res.confirm) {
          const newChecklist = that.data.checklist.filter(i => i.id !== itemId)
          
          wx.cloud.callFunction({
            name: 'subtask-update',
            data: {
              subtask_id: that.data.subtaskId,
              checklist: newChecklist
            }
          }).then(res => {
            if (res.result.success) {
              const completedCount = newChecklist.filter(i => i.completed).length
              const progress = newChecklist.length > 0 ? Math.round((completedCount / newChecklist.length) * 100) : 0
              
              that.setData({
                checklist: newChecklist,
                checklistCompletedCount: completedCount,
                checklistProgress: progress
              })
              wx.showToast({ title: '删除成功', icon: 'success' })
            }
          })
        }
      }
    })
  },

  // 格式化日期时间
  formatDateTime: function (timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 86400000 && date.getDate() === now.getDate()) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (diff < 172800000 && date.getDate() === yesterday.getDate()) {
      return '昨天'
    }
    
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
})
