// pages/weekly/weekly.js
const app = getApp()

Page({
  data: {
    currentWeekStart: '',
    currentWeekEnd: '',
    currentDate: new Date(),
    stats: {
      totalTasks: 0,
      avgScore: 0,
      highScoreCount: 0,
      lowScoreCount: 0,
      attributionStats: []
    },
    weeklyTasks: []
  },

  onLoad: function () {
    this.initWeekDates()
    this.loadWeeklyTasks()
  },

  onPullDownRefresh: function () {
    this.loadWeeklyTasks()
    wx.stopPullDownRefresh()
  },

  // 初始化当前周日期
  initWeekDates: function () {
    const now = this.data.currentDate
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // 周一为起点
    
    const monday = new Date(now.setDate(diff))
    const sunday = new Date(now.setDate(diff + 6))
    
    this.setData({
      currentWeekStart: this.formatDate(monday),
      currentWeekEnd: this.formatDate(sunday),
      currentDate: new Date()
    })
  },

  // 上一周
  prevWeek: function () {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() - 7)
    this.setData({ currentDate })
    this.initWeekDates()
    this.loadWeeklyTasks()
  },

  // 下一周
  nextWeek: function () {
    const current = new Date(this.data.currentDate)
    if (current < new Date()) {
      current.setDate(current.getDate() + 7)
      this.setData({ currentDate })
      this.initWeekDates()
      this.loadWeeklyTasks()
    } else {
      wx.showToast({ title: '未来周无数据', icon: 'none' })
    }
  },

  // 加载周任务数据
  loadWeeklyTasks: function () {
    const that = this
    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.callFunction({
      name: 'weekly-report',
      data: {
        week_start: this.data.currentWeekStart,
        week_end: this.data.currentWeekEnd
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        that.setData({
          weeklyTasks: res.result.data.tasks,
          stats: res.result.data.stats
        })
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('加载周报失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 计算统计数据
  calculateStats: function (tasks) {
    if (tasks.length === 0) {
      this.setData({
        stats: {
          totalTasks: 0,
          avgScore: 0,
          highScoreCount: 0,
          lowScoreCount: 0,
          attributionStats: []
        }
      })
      return
    }

    const totalScore = tasks.reduce((sum, t) => sum + (t.score || 0), 0)
    const avgScore = Math.round(totalScore / tasks.length)
    const highScoreCount = tasks.filter(t => t.score >= 100).length
    const lowScoreCount = tasks.filter(t => t.score < 80).length

    // 归因统计
    const attributionMap = {}
    tasks.forEach(task => {
      if (task.attribution_tags && task.attribution_tags.length > 0) {
        task.attribution_tags.forEach(tag => {
          attributionMap[tag] = (attributionMap[tag] || 0) + 1
        })
      }
    })

    const attributionStats = Object.entries(attributionMap)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / tasks.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)

    this.setData({
      stats: {
        totalTasks: tasks.length,
        avgScore,
        highScoreCount,
        lowScoreCount,
        attributionStats
      }
    })
  },

  // 生成周报分享
  generateReport: function () {
    const s = this.data.stats
    const tasks = this.data.weeklyTasks
    
    let report = `📊 事绩通·周报\n`
    report += `时间：${this.data.currentWeekStart} ~ ${this.data.currentWeekEnd}\n\n`
    report += `✅ 完成任务：${s.totalTasks} 个\n`
    report += `📈 平均分：${s.avgScore} 分\n`
    report += `🌟 优秀任务：${s.highScoreCount} 个\n`
    report += `⚠️ 待改进：${s.lowScoreCount} 个\n\n`
    
    if (s.attributionStats.length > 0) {
      report += `📋 归因分析：\n`
      s.attributionStats.forEach((item, i) => {
        report += `${i+1}. ${item.tag}：${item.count}次 (${item.percentage}%)\n`
      })
      report += `\n`
    }
    
    report += `📝 任务详情：\n`
    tasks.forEach((t, i) => {
      report += `${i+1}. 【${t.score}分】${t.task_name}\n`
    })
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: report,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      }
    })
  },

  // 跳转详情
  goDetail: function (e) {
    const taskId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${taskId}`
    })
  },

  // 辅助函数
  formatDate: function (date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  },

  formatDateOnly: function (date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  },

  getScoreLevel: function (score) {
    if (score >= 100) return 'high'
    if (score >= 80) return 'normal'
    return 'low'
  }
})
