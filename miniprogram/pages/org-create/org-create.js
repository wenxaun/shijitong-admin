// pages/org-create/org-create.js
const app = getApp()

Page({
  data: {
    name: '',
    shortName: '',
    description: ''
  },

  // 输入处理
  onInput: function (e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [field]: value })
  },

  // 提交创建
  submitCreate: function () {
    const { name, shortName, description } = this.data

    if (!name || name.length < 2) {
      wx.showToast({ title: '组织名称至少 2 字', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建中...' })

    wx.cloud.callFunction({
      name: 'org-create',
      data: {
        name: name.trim(),
        short_name: shortName.trim(),
        description: description.trim()
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' })
        
        // 更新全局用户信息
        if (app.globalData.userInfo) {
          app.globalData.userInfo.organization_id = res.result.data.organization_id
          app.globalData.userInfo.organization_name = name
          app.globalData.userInfo.role = 'creator'
        }
        
        // 跳转到团队管理页面
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/team-manage/team-manage' })
        }, 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('创建组织失败:', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    })
  }
})
