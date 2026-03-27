// pages/subtask-flow/subtask-flow.js
const app = getApp()

Page({
  data: {
    subtaskId: '',
    taskName: '',
    currentExecutorName: '',
    memberList: [],
    toExecutorIndex: -1,
    reason: '',
    note: '',
    flowHistory: []
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ subtaskId: options.id })
      this.loadSubtask()
    }
  },

  // 加载子任务信息
  loadSubtask: function () {
    const that = this
    wx.showLoading({ title: '加载中...' })

    wx.cloud.database().collection('tasks').doc(this.data.subtaskId).get().then(res => {
      if (res.data) {
        const task = res.data
        that.setData({
          taskName: task.task_name,
          flowHistory: task.flow_history || []
        })

        // 获取当前执行人名称
        return wx.cloud.database().collection('users').where({
          openid: task.current_executor
        }).field({ nickname: true }).get()
      }
    }).then(userRes => {
      if (userRes && userRes.data.length > 0) {
        that.setData({
          currentExecutorName: userRes.data[0].nickname
        })
      }

      // 加载团队成员列表
      that.loadTeamMembers()
      wx.hideLoading()
    }).catch(err => {
      wx.hideLoading()
      console.error('加载子任务失败:', err)
    })
  },

  // 加载团队成员
  loadTeamMembers: function () {
    const that = this
    
    wx.cloud.database().collection('users').where({
      openid: app.globalData.openid
    }).get().then(userRes => {
      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        
        if (user.organization_id) {
          wx.cloud.database().collection('users').where({
            organization_id: user.organization_id
          }).field({
            openid: true,
            nickname: true
          }).get().then(membersRes => {
            // 排除当前执行人
            const members = membersRes.data.filter(m => m.openid !== that.data.currentExecutorName)
            that.setData({ memberList: members })
          })
        } else {
          that.setData({ memberList: [] })
        }
      }
    })
  },

  // 接收人选择
  onToExecutorChange: function (e) {
    this.setData({ toExecutorIndex: parseInt(e.detail.value) })
  },

  // 原因输入
  onReasonInput: function (e) {
    this.setData({ reason: e.detail.value })
  },

  // 备注输入
  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  // 提交流转
  submitFlow: function () {
    const that = this

    if (this.data.toExecutorIndex < 0) {
      wx.showToast({ title: '请选择接收人', icon: 'none' })
      return
    }

    const toExecutor = this.data.memberList[this.data.toExecutorIndex]

    wx.showLoading({ title: '流转中...' })

    wx.cloud.callFunction({
      name: 'subtask-update',
      data: {
        subtask_id: this.data.subtaskId,
        flow_request: {
          to_executor: toExecutor.openid,
          reason: this.data.reason,
          note: this.data.note
        }
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '流转成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('流转失败:', err)
      wx.showToast({ title: '流转失败', icon: 'none' })
    })
  },

  // 格式化日期
  formatDate: function (date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
})
