// pages/splash/splash.js - 启动引导页
const app = getApp()

Page({
  data: {
    isLoggedIn: false
  },

  onLoad: function () {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus: async function () {
    const userInfo = wx.getStorageSync('userInfo')
    const userId = wx.getStorageSync('userId')
    const sessionToken = wx.getStorageSync('sessionToken')

    // 检查本地存储和会话
    if (userId && sessionToken) {
      // 验证会话是否有效
      try {
        const res = await wx.cloud.callFunction({
          name: 'validate-session',
          data: { token: sessionToken }
        })
        
        if (res.result && res.result.valid) {
          this.setData({ isLoggedIn: true })
          
          // 已登录自动跳转首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 500)
          return
        }
      } catch (err) {
        console.error('验证会话失败:', err)
      }
    }

    // 未登录，显示登录注册按钮
    this.setData({ isLoggedIn: false })
  },

  // 进入首页
  goHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 去登录
  goLogin: function () {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 去注册
  goRegister: function () {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  }
})
