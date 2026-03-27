// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-3g7j95ax4a0f4a3f', // 云开发环境 ID
        traceUser: true
      })
    }

    this.globalData = {
      userInfo: null,
      isOpenid: false,
      openid: null
    }

    // 获取 OPENID
    this.getOpenid()
  },

  onShow: function () {
    // 每次显示时确保用户数据已写入
    if (this.globalData.openid) {
      this.ensureUserSaved()
    }
    
    // 启动定时检查
    this.startScheduledCheck()
  },

  // 启动定时检查
  startScheduledCheck: function () {
    // 清除之前的定时器（如果有）
    if (this.timerScheduled) {
      clearInterval(this.timerScheduled)
    }

    // 每分钟检查一次
    this.timerScheduled = setInterval(() => {
      this.checkScheduledTasks()
    }, 60000) // 60 秒

    console.log('定时检查已启动')
  },

  // 检查是否在免打扰时段
  isQuietHours: function () {
    const now = new Date()
    const hours = now.getHours()
    
    // 免打扰时段：20:00 - 08:00
    return hours >= 20 || hours < 8
  },

  // 检查定时任务
  checkScheduledTasks: function () {
    // 免打扰时段不检查
    if (this.isQuietHours()) {
      return
    }

    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const currentTime = `${hours}:${minutes}`

    // 获取用户设置的提醒时间
    const settings = wx.getStorageSync('userSettings')
    const reminderTime = settings.reminderTime || '16:00'
    const enableReminder = settings.enableReminder !== false

    // 检查是否到达提醒时间且启用了提醒
    if (enableReminder && currentTime === reminderTime) {
      console.log(`定时检查触发：${reminderTime}`)
      this.showReminder()
    }
  },

  // 显示提醒弹窗
  showReminder: function () {
    const openid = this.globalData.openid
    if (!openid) return

    const db = wx.cloud.database()
    const today = new Date().toISOString().split('T')[0]

    // 查询当天到期且未完成的任务
    db.collection('tasks').where({
      executor_id: openid,
      require_date: db.command.eq(new Date(today)),
      status: db.command.neq('completed')
    }).get().then(res => {
      const tasks = res.data
      console.log('当天到期未完成任务:', tasks)

      if (tasks.length > 0) {
        // 有任务需要提醒
        this.showExceptionReminder(tasks)
      }
    }).catch(err => {
      console.error('查询任务失败:', err)
    })
  },

  // 显示异常上报提醒
  showExceptionReminder: function (tasks) {
    const taskNames = tasks.map(t => t.task_name).join('\n')
    
    wx.showModal({
      title: '⏰ 任务到期提醒',
      content: `以下任务今日到期但尚未完成：\n\n${taskNames}\n\n是否需要上报异常？`,
      confirmText: '上报异常',
      cancelText: '继续推进',
      confirmColor: '#faad14',
      success: (res) => {
        if (res.confirm) {
          // 跳转到第一个任务的异常上报页面
          const firstTask = tasks[0]
          wx.navigateTo({
            url: `/pages/exception/exception?id=${firstTask._id}&name=${encodeURIComponent(firstTask.task_name)}&date=${firstTask.require_date}`
          })
        }
        // 取消则不做任何操作，继续推进
      }
    })
  },

  // 获取 OPENID
  getOpenid: function () {
    wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      const openid = res.result.openid
      this.globalData.openid = openid
      this.globalData.isOpenid = true
      console.log('获取 OPENID 成功:', openid)
      this.ensureUserSaved()
    }).catch(err => {
      console.error('获取 OPENID 失败:', err)
    })
  },

  // 检查登录状态
  checkLogin: function () {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  // 确保用户数据已写入数据库
  ensureUserSaved: function () {
    const openid = this.globalData.openid
    if (!openid) return

    const userInfo = this.globalData.userInfo || {}
    const db = wx.cloud.database()

    // 检查是否已存在
    db.collection('users').where({
      openid: openid
    }).get().then(res => {
      if (res.data.length === 0) {
        // 创建用户记录
        db.collection('users').add({
          data: {
            openid: openid,
            nickname: userInfo.nickName || '微信用户',
            avatar_url: userInfo.avatarUrl || '',
            role: 'executor',
            created_at: new Date(),
            last_login: new Date()
          }
        }).then(() => {
          console.log('用户数据已创建')
        })
      } else {
        // 更新最后登录时间
        db.collection('users').doc(res.data[0]._id).update({
          data: {
            last_login: new Date(),
            nickname: userInfo.nickName || res.data[0].nickname
          }
        })
      }
    }).catch(err => {
      console.error('检查用户失败:', err)
    })
  },

  // 获取用户信息
  getUserInfo: function (cb) {
    if (this.globalData.userInfo) {
      typeof cb == "function" && cb(this.globalData.userInfo)
    } else {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          this.globalData.userInfo = res.userInfo
          wx.setStorageSync('userInfo', res.userInfo)
          this.ensureUserSaved()
          typeof cb == "function" && cb(this.globalData.userInfo)
        }
      })
    }
  },

  // 页面隐藏时清除定时器（节省资源）
  onHide: function () {
    if (this.timer1600) {
      clearInterval(this.timer1600)
    }
  }
})
