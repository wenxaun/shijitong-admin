// pages/review/review.js
const app = getApp()

Page({
  data: {
    taskId: '',
    score: null,
    scoreNote: '',
    learnings: '',
    delayReason: '',
    improvements: '',
    attributionTags: [],
    // 归因选项状态
    tagSkills: false,
    tagProcess: false,
    tagCommunication: false,
    tagResources: false,
    tagJudgment: false,
    tagEmotion: false
  },

  onLoad: function (options) {
    if (options.id && options.score) {
      this.setData({
        taskId: options.id,
        score: parseInt(options.score),
        scoreNote: options.scoreNote || ''
      })
    }
  },

  onLearningsInput: function (e) {
    this.setData({ learnings: e.detail.value })
  },

  onDelayReasonInput: function (e) {
    this.setData({ delayReason: e.detail.value })
  },

  onImprovementsInput: function (e) {
    this.setData({ improvements: e.detail.value })
  },

  toggleAttribution: function (e) {
    const tag = e.currentTarget.dataset.tag
    
    const index = this.data.attributionTags.indexOf(tag)
    let newTags = [...this.data.attributionTags]
    
    if (index >= 0) {
      newTags.splice(index, 1)
    } else {
      newTags.push(tag)
    }
    
    // 更新所有状态
    this.setData({
      attributionTags: newTags,
      tagSkills: newTags.indexOf('技能不足') > -1,
      tagProcess: newTags.indexOf('流程问题') > -1,
      tagCommunication: newTags.indexOf('沟通问题') > -1,
      tagResources: newTags.indexOf('资源不足') > -1,
      tagJudgment: newTags.indexOf('判断失误') > -1,
      tagEmotion: newTags.indexOf('情绪影响') > -1
    })
    
    console.log('归因更新:', newTags)
  },

  submitReview: function () {
    // 验证必填字段（得分<80 时）
    if (this.data.score < 80) {
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

    // 调试日志
    console.log('提交复盘数据:', {
      taskId: this.data.taskId,
      learnings: this.data.learnings,
      delayReason: this.data.delayReason,
      improvements: this.data.improvements,
      attributionTags: this.data.attributionTags
    })

    // 调用云函数更新任务
    wx.showLoading({ title: '提交中...' })

    wx.cloud.callFunction({
      name: 'task-update',
      data: {
        task_id: this.data.taskId,
        status: 'completed',
        learnings: this.data.learnings.trim(),
        delay_reason: this.data.delayReason.trim(),
        improvements: this.data.improvements.trim(),
        attribution_tags: this.data.attributionTags
      }
    }).then(res => {
      wx.hideLoading()
      console.log('云函数返回:', res.result)
      if (res.result.success) {
        wx.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('提交复盘失败:', err)
      wx.showToast({ title: '提交失败', icon: 'none' })
    })
  }
})
