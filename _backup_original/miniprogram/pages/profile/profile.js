// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    userId: null,
    envId: 'cloud1-3g7j95ax4a0f4a3f',
    appId: 'wx2be578f65935b5e8'
  },

  onLoad: function () {
    this.loadUserInfo()
  },

  onShow: function () {
    // 每次显示时重新加载用户信息（确保 openid 已获取）
    this.loadUserInfo()
  },

  loadUserInfo: function () {
    const userInfo = wx.getStorageSync('userInfo')
    // 优先从 app.globalData 获取 openid
    const userId = app.globalData.openid || wx.getStorageSync('userId')
    
    this.setData({
      userInfo: userInfo || {},
      userId: userId || null
    })
  },

  copyEnvId: function () {
    wx.setClipboardData({
      data: this.data.envId,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  copyAppId: function () {
    wx.setClipboardData({
      data: this.data.appId,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  goSettings: function () {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  goHistory: function () {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  goWeekly: function () {
    wx.navigateTo({
      url: '/pages/weekly/weekly'
    })
  },

  goStats: function () {
    wx.navigateTo({
      url: '/pages/stats/stats'
    })
  },

  goTeam: function () {
    wx.navigateTo({
      url: '/pages/team/team'
    })
  },

  logout: function () {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.clearStorageSync()
          app.globalData.userId = null
          app.globalData.openid = null
          app.globalData.userInfo = null
          wx.reLaunch({ url: '/pages/splash/splash' })
        }
      }
    })
  }
})
