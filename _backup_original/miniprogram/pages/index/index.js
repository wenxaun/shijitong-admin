// pages/index/index.js
const app = getApp()

Page({
  data: {
    tasks: [],
    currentFilter: 'all',
    timeFilter: 'all',
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false
  },

  onLoad: function () {
    this.loadTasks()
  },

  onShow: function () {
    // 每次显示页面时刷新列表
    this.loadTasks(true)
  },

  // 加载任务列表
  loadTasks: function (refresh = false) {
    if (this.data.loading) return

    const page = refresh ? 1 : this.data.page + 1
    
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'task-list',
      data: {
        status: this.data.currentFilter === 'all' ? undefined : this.data.currentFilter,
        time_filter: this.data.timeFilter,
        page: page,
        pageSize: this.data.pageSize
      }
    }).then(res => {
      if (res.result.success) {
        const tasks = refresh ? res.result.data.tasks : [...this.data.tasks, ...res.result.data.tasks]
        this.setData({
          tasks,
          page,
          hasMore: res.result.data.hasMore,
          loading: false
        })
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
        this.setData({ loading: false })
      }
    }).catch(err => {
      console.error('加载任务失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    })
  },

  // 设置状态筛选
  setFilter: function (e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      currentFilter: filter,
      page: 1,
      tasks: [],
      hasMore: true
    })
    this.loadTasks(true)
  },

  // 设置时间筛选
  setTimeFilter: function (e) {
    const time = e.currentTarget.dataset.time
    this.setData({
      timeFilter: time,
      page: 1,
      tasks: [],
      hasMore: true
    })
    this.loadTasks(true)
  },

  // 加载更多
  loadMore: function () {
    this.loadTasks()
  },

  // 跳转到详情页
  goDetail: function (e) {
    const taskId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${taskId}` })
  }
})
