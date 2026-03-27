// pages/register/register.js - v5.0.2 飞书风格重构
const app = getApp()

Page({
  data: {
    openid: '',
    nickname: '',
    phone: '',
    orgList: [],
    orgIndex: -1,
    orgName: ''
  },

  onLoad: function (options) {
    if (options.openid) {
      this.setData({ openid: options.openid })
    }
    
    // 加载组织列表
    this.loadOrgList()
  },

  // 加载组织列表
  loadOrgList: function () {
    const that = this
    const db = wx.cloud.database()
    
    db.collection('organizations').field({
      _id: true,
      name: true
    }).get().then(res => {
      that.setData({
        orgList: res.data
      })
    })
  },

  // 昵称输入
  onNicknameInput: function (e) {
    this.setData({ nickname: e.detail.value })
  },

  // 手机号输入
  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value })
  },

  // 选择组织
  selectOrg: function () {
    const that = this
    const orgList = this.data.orgList
    
    if (orgList.length === 0) {
      wx.showToast({ title: '暂无组织', icon: 'none' })
      return
    }
    
    wx.showActionSheet({
      itemList: orgList.map(o => o.name),
      success: (res) => {
        that.setData({
          orgIndex: res.tapIndex,
          orgName: orgList[res.tapIndex].name
        })
      }
    })
  },

  // 注册
  register: function () {
    // 验证必填字段
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }

    if (!this.data.phone.trim()) {
      wx.showToast({ title: '请填写手机号', icon: 'none' })
      return
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建中...' })

    const db = wx.cloud.database()
    const userData = {
      openid: this.data.openid,
      nickname: this.data.nickname,
      phone: this.data.phone,
      organization_id: this.data.orgIndex >= 0 ? this.data.orgList[this.data.orgIndex]._id : null,
      organization_name: this.data.orgName,
      avatar_url: '',
      created_at: Date.now(),
      updated_at: Date.now()
    }

    db.collection('users').add({
      data: userData
    }).then(res => {
      wx.hideLoading()
      
      // 保存到全局
      app.globalData.openid = this.data.openid
      app.globalData.userInfo = {
        ...userData,
        _id: res._id
      }
      wx.setStorageSync('openid', this.data.openid)
      
      wx.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
    }).catch(err => {
      wx.hideLoading()
      console.error('注册失败:', err)
      wx.showToast({ title: '注册失败，请重试', icon: 'none' })
    })
  },

  // 返回登录
  goToLogin: function () {
    wx.navigateBack()
  }
})
