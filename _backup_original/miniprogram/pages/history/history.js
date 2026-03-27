// pages/history/history.js
const app = getApp()

Page({
  data: {
    currentTab: 'created', // created, executed, deleted
    tasks: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    usersMap: {}
  },

  onLoad: function () {
    this.loadUsers()
    this.loadTasks()
  },

  onShow: function () {
    this.loadTasks(true)
  },

  // 加载用户列表
  loadUsers: function () {
    const db = wx.cloud.database()
    db.collection('users').limit(100).get().then(res => {
      const usersMap = {}
      res.data.forEach(u => {
        usersMap[u.openid] = u.nickname || '微信用户'
      })
      this.setData({ usersMap })
    }).catch(err => {
      console.error('加载用户列表失败:', err)
    })
  },

  // 切换标签
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab,
      page: 1,
      tasks: [],
      hasMore: true
    })
    this.loadTasks(true)
  },

  // 加载任务列表
  loadTasks: function (refresh = false) {
    if (this.data.loading) return

    const page = refresh ? 1 : this.data.page + 1
    this.setData({ loading: true })

    const db = wx.cloud.database()
    const openid = app.globalData.openid
    
    // 构建查询条件
    let query = {}
    
    if (this.data.currentTab === 'created') {
      // 我创建的任务（不包括已删除）
      query.publisher_id = openid
      query.deleted = { $ne: true }
    } else if (this.data.currentTab === 'executed') {
      // 我执行的任务（不包括已删除）
      query.executor_id = openid
      query.deleted = { $ne: true }
    } else if (this.data.currentTab === 'deleted') {
      // 已删除的任务（我创建的）
      query.publisher_id = openid
      query.deleted = true
    }

    db.collection('tasks').where(query)
      .orderBy('updated_at', 'desc')
      .skip((page - 1) * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const tasks = res.data.map(task => ({
          task_id: task._id,
          task_name: task.task_name,
          status: task.status,
          priority: task.priority,
          publisher_id: task.publisher_id,
          publisher_name: this.data.usersMap[task.publisher_id] || '未知',
          executor_id: task.executor_id,
          executor_name: this.data.usersMap[task.executor_id] || '未知',
          require_date: this.formatDate(task.require_date),
          complete_date: task.complete_date ? this.formatDate(task.complete_date) : null,
          score: task.score,
          score_note: task.score_note,
          deleted: task.deleted || false,
          updated_at: this.formatDate(task.updated_at)
        }))

        const newTasks = refresh ? tasks : [...this.data.tasks, ...tasks]
        
        this.setData({
          tasks: newTasks,
          page,
          hasMore: tasks.length === this.data.pageSize,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载失败:', err)
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 加载更多
  loadMore: function () {
    this.loadTasks()
  },

  // 跳转到详情页
  goDetail: function (e) {
    const taskId = e.currentTarget.dataset.id
    const isDeleted = this.data.tasks.find(t => t.task_id === taskId)?.deleted
    
    if (isDeleted) {
      // 已删除任务只能查看，不能操作
      wx.navigateTo({
        url: `/pages/detail/detail?id=${taskId}&readonly=true`
      })
    } else {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${taskId}`
      })
    }
  },

  // 格式化日期
  formatDate: function (date) {
    if (!date) return null
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
