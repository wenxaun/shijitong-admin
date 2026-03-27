// pages/exception/exception.js
const app = getApp()

Page({
  data: {
    taskId: '',
    taskName: '',
    requireDate: '',
    exceptionReason: '',
    needDelay: null,  // true/false/null
    delayDate: ''
  },

  onLoad: function (options) {
    if (options.id && options.name && options.date) {
      this.setData({
        taskId: options.id,
        taskName: options.name,
        requireDate: options.date
      })
    }
  },

  onReasonInput: function (e) {
    this.setData({ exceptionReason: e.detail.value })
  },

  setNeedDelay: function (e) {
    const value = e.currentTarget.dataset.value
    this.setData({ needDelay: (value === 'true') })
  },

  onDelayDateChange: function (e) {
    this.setData({ delayDate: e.detail.value })
  },

  submitException: function () {
    // 验证必填字段
    if (!this.data.exceptionReason.trim()) {
      wx.showToast({ title: '请填写异常原因', icon: 'none' })
      return
    }

    if (this.data.needDelay === true && !this.data.delayDate) {
      wx.showToast({ title: '请选择延期日期', icon: 'none' })
      return
    }

    // 调用云函数上报异常
    wx.showLoading({ title: '提交中...' })

    wx.cloud.callFunction({
      name: 'task-exception',
      data: {
        task_id: this.data.taskId,
        exception_reason: this.data.exceptionReason.trim(),
        need_delay: this.data.needDelay,
        delay_date: this.data.delayDate
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '上报成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('上报失败:', err)
      wx.showToast({ title: '上报失败', icon: 'none' })
    })
  },

  cancelException: function () {
    // 不上报，直接返回
    wx.navigateBack()
  }
})
