// pages/settings/settings.js
const app = getApp()

Page({
  data: {
    enableReminder: true,
    reminderTime: '16:00',
    receiveAssignNotify: true,
    receiveExceptionNotify: true,
    envId: 'cloud1-3g7j95ax4a0f4a3f',
    appId: 'wx2be578f65935b5e8'
  },

  onLoad: function () {
    this.loadSettings()
  },

  // 加载设置
  loadSettings: function () {
    const settings = wx.getStorageSync('userSettings')
    if (settings) {
      this.setData({
        enableReminder: settings.enableReminder !== false,
        reminderTime: settings.reminderTime || '16:00',
        receiveAssignNotify: settings.receiveAssignNotify !== false,
        receiveExceptionNotify: settings.receiveExceptionNotify !== false
      })
    }
  },

  // 保存设置
  saveSettings: function () {
    const settings = {
      enableReminder: this.data.enableReminder,
      reminderTime: this.data.reminderTime,
      receiveAssignNotify: this.data.receiveAssignNotify,
      receiveExceptionNotify: this.data.receiveExceptionNotify,
      updatedAt: new Date()
    }
    wx.setStorageSync('userSettings', settings)
    console.log('设置已保存:', settings)
  },

  onEnableChange: function (e) {
    this.setData({ enableReminder: e.detail.value })
    this.saveSettings()
  },

  onTimeChange: function (e) {
    this.setData({ reminderTime: e.detail.value })
    this.saveSettings()
  },

  onAssignNotifyChange: function (e) {
    this.setData({ receiveAssignNotify: e.detail.value })
    this.saveSettings()
  },

  onExceptionNotifyChange: function (e) {
    this.setData({ receiveExceptionNotify: e.detail.value })
    this.saveSettings()
  },

  copyEnvId: function () {
    wx.setClipboardData({
      data: this.data.envId,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  copyAppId: function () {
    wx.setClipboardData({
      data: this.data.appId,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  }
})
