// pages/subtask-manage/subtask-manage.js - v5.0.0 简化版
const app = getApp()

Page({
  data: {
    parentTaskId: '',
    parentTaskStatus: '',
    subtasks: [],
    total: 0,
    completedCount: 0,
    progress: 0,
    loading: true
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ parentTaskId: options.id })
      this.loadParentTaskStatus()
      this.loadSubtasks()
    }
  },

  // 加载主任务状态
  loadParentTaskStatus: function () {
    const that = this
    const db = wx.cloud.database()
    
    db.collection('tasks').doc(this.data.parentTaskId).get().then(res => {
      if (res.data) {
        that.setData({ parentTaskStatus: res.data.status })
      }
    })
  },

  onShow: function () {
    if (this.data.parentTaskId) {
      this.loadSubtasks()
    }
  },

  // 加载子任务列表
  loadSubtasks: function () {
    const that = this
    wx.showLoading({ title: '加载中...' })

    const db = wx.cloud.database()
    db.collection('tasks').where({
      parent_task_id: this.data.parentTaskId,
      is_subtask: true
    }).orderBy('created_at', 'desc').get().then(res => {
      const subtasks = res.data
      const total = subtasks.length
      const completed = subtasks.filter(s => s.status === 'completed').length
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0

      // 获取负责人名称
      const executorIds = [...new Set(subtasks.map(s => s.executor_id))]
      if (executorIds.length > 0) {
        return db.collection('users').where({
          openid: db.command.in(executorIds)
        }).field({ openid: true, nickname: true }).get().then(usersRes => {
          const userMap = {}
          usersRes.data.forEach(u => { userMap[u.openid] = u.nickname })

          const now = new Date()
          const enrichedSubtasks = subtasks.map(s => {
            const requireDate = new Date(s.require_date)
            const isOverdue = requireDate < now && s.status !== 'completed'

            return {
              ...s,
              executor_name: userMap[s.executor_id] || '未分配',
              is_overdue: isOverdue
            }
          })

          return { subtasks: enrichedSubtasks, total, completed, progress }
        })
      } else {
        return { subtasks, total, completed, progress }
      }
    }).then(data => {
      if (!data) {
        wx.hideLoading()
        that.setData({ loading: false, subtasks: [], total: 0, completedCount: 0, progress: 0 })
        return
      }

      that.setData({
        subtasks: data.subtasks,
        total: data.total,
        completedCount: data.completed,
        progress: data.progress,
        loading: false
      })

      wx.hideLoading()

      // 如果全部完成，提示是否完成主任务
      if (data.total > 0 && data.progress === 100) {
        that.checkParentTaskCompletion()
      }
    }).catch(err => {
      console.error('加载子任务失败:', err)
      wx.hideLoading()
      that.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 检查主任务完成状态
  checkParentTaskCompletion: function () {
    const that = this
    wx.showModal({
      title: '所有子任务已完成',
      content: '是否将主任务标记为完成？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '提交中...' })
          
          wx.cloud.callFunction({
            name: 'task-update',
            data: {
              task_id: this.data.parentTaskId,
              status: 'completed'
            }
          }).then(res => {
            wx.hideLoading()
            if (res.result.success) {
              wx.showToast({ title: '已完成', icon: 'success' })
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            } else {
              // 显示具体错误信息
              wx.showModal({
                title: '提示',
                content: res.result.message || '更新失败，请检查权限',
                showCancel: false
              })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error('更新主任务失败:', err)
            wx.showModal({
              title: '提示',
              content: '更新失败：' + (err.errMsg || '网络错误'),
              showCancel: false
            })
          })
        }
      }
    })
  },

  // 跳转到添加子任务页面
  goToAddSubtask: function () {
    wx.navigateTo({
      url: `/pages/subtask-create/subtask-create?id=${this.data.parentTaskId}`
    })
  },

  // 跳转到子任务详情页
  goToSubtaskDetail: function (e) {
    const subtaskId = e.currentTarget.dataset.id
    if (!subtaskId) {
      wx.showToast({ title: '子任务 ID 缺失', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/subtask-detail/subtask-detail?id=${subtaskId}`
    })
  }
})
