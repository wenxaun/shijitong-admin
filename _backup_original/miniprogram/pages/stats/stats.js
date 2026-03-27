// pages/stats/stats.js
const app = getApp()

Page({
  data: {
    rangeType: 'month',
    metrics: {
      totalTasks: 0,
      completedTasks: 0,
      avgScore: 0,
      onTimeRate: 0
    },
    scoreDistribution: [],
    priorityDistribution: [],
    categoryStats: [],
    trendData: []
  },

  onLoad: function () {
    this.loadStats()
  },

  onPullDownRefresh: function () {
    this.loadStats()
    wx.stopPullDownRefresh()
  },

  // 切换时间范围
  setRange: function (e) {
    const type = e.currentTarget.dataset.type
    this.setData({ rangeType: type })
    this.loadStats()
  },

  // 加载统计数据
  loadStats: function () {
    const that = this
    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.callFunction({
      name: 'task-stats',
      data: {
        rangeType: this.data.rangeType
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        that.setData({
          metrics: res.result.data.metrics,
          scoreDistribution: res.result.data.scoreDistribution,
          priorityDistribution: res.result.data.priorityDistribution,
          categoryStats: res.result.data.categoryStats
        })
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('加载统计失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 计算核心指标
  calculateMetrics: function (tasks) {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'completed').length
    const onTime = tasks.filter(t => t.score >= 80).length
    const totalScore = tasks.reduce((sum, t) => sum + (t.score || 0), 0)
    
    this.setData({
      metrics: {
        totalTasks: total,
        completedTasks: completed,
        avgScore: total > 0 ? Math.round(totalScore / completed) : 0,
        onTimeRate: completed > 0 ? Math.round((onTime / completed) * 100) : 0
      }
    })
  },

  // 计算分数分布
  calculateScoreDistribution: function (tasks) {
    const completed = tasks.filter(t => t.status === 'completed' && t.score)
    const ranges = [
      { range: '100 分', min: 100, max: 100, color: '#34C759' },
      { range: '80-99 分', min: 80, max: 99, color: '#007AFF' },
      { range: '60-79 分', min: 60, max: 79, color: '#FF9500' },
      { range: '30-59 分', min: 30, max: 59, color: '#FF3B30' }
    ]
    
    const distribution = ranges.map(range => {
      const count = completed.filter(t => t.score >= range.min && t.score <= range.max).length
      const percentage = completed.length > 0 ? Math.round((count / completed.length) * 100) : 0
      return { ...range, count, percentage }
    })
    
    this.setData({ scoreDistribution: distribution })
  },

  // 计算优先级分布
  calculatePriorityDistribution: function (tasks) {
    const priorities = ['P0', 'P1', 'P2', 'P3']
    const total = tasks.length
    
    const distribution = priorities.map(p => {
      const count = tasks.filter(t => t.priority === p).length
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      return { priority: p, count, percentage }
    })
    
    this.setData({ priorityDistribution: distribution })
  },

  // 计算分类统计
  calculateCategoryStats: function (tasks) {
    const categoryMap = {}
    tasks.forEach(t => {
      const cat = t.category || '未分类'
      if (!categoryMap[cat]) {
        categoryMap[cat] = { name: cat, count: 0, totalScore: 0 }
      }
      categoryMap[cat].count++
      categoryMap[cat].totalScore += (t.score || 0)
    })
    
    const stats = Object.values(categoryMap).map(c => ({
      ...c,
      avgScore: c.count > 0 ? Math.round(c.totalScore / c.count) : 0
    })).sort((a, b) => b.count - a.count)
    
    this.setData({ categoryStats: stats })
  },

  // 计算趋势数据（近 7 天）
  calculateTrendData: function (tasks) {
    const today = new Date()
    const trend = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = this.formatDate(date)
      
      const count = tasks.filter(t => {
        if (t.status !== 'completed' || !t.complete_date) return false
        const completeDate = this.formatDate(new Date(t.complete_date))
        return completeDate === dateStr
      }).length
      
      trend.push({
        date: this.formatDateShort(date),
        count,
        height: count * 20 // 简单的高度计算
      })
    }
    
    this.setData({ trendData: trend })
  },

  // 刷新数据
  refreshData: function () {
    wx.showLoading({ title: '刷新中...' })
    this.loadStats().then(() => {
      wx.hideLoading()
      wx.showToast({ title: '刷新成功', icon: 'success' })
    })
  },

  // 辅助函数
  getDateDaysAgo: function (days) {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return this.formatDate(date)
  },

  formatDate: function (date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  },

  formatDateShort: function (date) {
    return `${date.getMonth()+1}/${date.getDate()}`
  }
})
