// pages/detail/detail.js - v4.1.1 统一 UI 风格
const app = getApp()

Page({
  data: {
    // 基础数据
    taskId: '',
    task: null,
    loading: true,
    isReadonly: false,
    
    // Tab 相关
    currentTab: 'detail',  // detail | subtask | checklist | comment
    tabs: [
      { id: 'detail', name: '详情' },
      { id: 'subtask', name: '子任务' },
      { id: 'checklist', name: '清单' },
      { id: 'comment', name: '评论' }
    ],
    
    // 子任务数据
    subtaskProgress: { total: 0, completed: 0, progress: 0 },
    latestSubtasks: [],
    
    // 评论数据
    comments: [],
    commentInput: '',
    
    // 权限
    isPublisher: false,
    canEdit: false,
    canDelete: false,
    showMoreMenu: false,
    currentOpenid: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ 
        taskId: options.id,
        isReadonly: options.readonly === 'true',
        currentOpenid: app.globalData.openid
      })
      this.loadTask()
    }
  },

  onShow: function () {
    // 每次显示时刷新数据（子任务状态可能变更）
    if (this.data.taskId) {
      this.loadTask()
    }
  },

  // Tab 切换
  onTabChange: function (e) {
    const tabId = e.currentTarget.dataset.tab
    this.setData({ currentTab: tabId })
    
    // 切换到评论 Tab 时加载评论
    if (tabId === 'comment') {
      this.loadComments()
    }
  },

  // 加载任务详情
  loadTask: function () {
    const that = this
    wx.showLoading({ title: '加载中...' })

    const db = wx.cloud.database()
    db.collection('tasks').doc(this.data.taskId).get().then(taskRes => {
      const task = taskRes.data
      if (!task) {
        wx.hideLoading()
        that.setData({ loading: false })
        return
      }

      // 获取用户名称
      return Promise.all([
        db.collection('users').where({ openid: task.publisher_id }).get(),
        db.collection('users').where({ openid: task.executor_id }).get()
      ]).then(([publisherRes, executorRes]) => {
        const publisherName = publisherRes.data.length > 0 ? publisherRes.data[0].nickname : '未知'
        const executorName = executorRes.data.length > 0 ? executorRes.data[0].nickname : '未知'

        // 状态映射
        const statusTextMap = {
          'pending': '待办',
          'in_progress': '进行中',
          'completed': '已完成',
          'cancelled': '已取消'
        }

        // 检查是否为发布人
        const isPublisher = (task.publisher_id === that.data.currentOpenid)
        
        // 检查是否为执行人
        const isExecutor = (task.executor_id === that.data.currentOpenid)
        
        // 权限判断：发布人或执行人可以编辑
        const canEdit = isPublisher || isExecutor
        
        // 只有发布人可以删除
        const canDelete = isPublisher

        // 格式化日期
        const formatDate = (date) => {
          if (!date) return ''
          const d = new Date(date)
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        }

        // 加载子任务进度
        that.loadSubtaskProgress(task)

        that.setData({
          task: {
            ...task,
            publisher_name: publisherName,
            executor_name: executorName,
            statusText: statusTextMap[task.status] || '待办',
            require_date: formatDate(task.require_date)
          },
          isPublisher: isPublisher,
          isExecutor: isExecutor,
          canEdit: canEdit,
          canDelete: canDelete,
          loading: false
        })

        wx.hideLoading()
      })
    }).catch(err => {
      console.error('加载任务失败:', err)
      wx.hideLoading()
      that.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 加载子任务进度（直接查询最新状态）
  loadSubtaskProgress: function () {
    const that = this
    const db = wx.cloud.database()

    // 直接查询子任务（不依赖缓存的 subtask_count）
    db.collection('tasks').where({
      parent_task_id: this.data.taskId,
      is_subtask: true
    }).get().then(subtasksRes => {
      const subtasks = subtasksRes.data
      const total = subtasks.length
      const completed = subtasks.filter(s => s.status === 'completed').length
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0

      // 加载子任务执行人名称
      const executorIds = [...new Set(subtasks.map(s => s.executor_id))]
      if (executorIds.length > 0) {
        db.collection('users').where({
          openid: db.command.in(executorIds)
        }).field({ openid: true, nickname: true }).get().then(usersRes => {
          const userMap = {}
          usersRes.data.forEach(u => { userMap[u.openid] = u.nickname })

          const latestSubtasks = subtasks.map(s => ({
            ...s,
            executor_name: userMap[s.executor_id] || '未知'
          }))

          that.setData({
            subtaskProgress: { total, completed, progress },
            latestSubtasks: latestSubtasks
          })
        })
      } else {
        that.setData({
          subtaskProgress: { total, completed, progress },
          latestSubtasks: subtasks
        })
      }
    })
  },

  // 加载评论列表
  loadComments: function () {
    const that = this
    wx.cloud.callFunction({
      name: 'comment-list',
      data: { task_id: this.data.taskId, limit: 50 }
    }).then(res => {
      if (res.result.success) {
        // 预计算 timeText
        const comments = res.result.comments.map(c => ({
          ...c,
          timeText: this.formatDateTime(c.created_at)
        }))
        that.setData({ comments: comments })
      }
    })
  },

  // 评论输入
  onCommentInput: function (e) {
    this.setData({ commentInput: e.detail.value })
  },

  // 添加评论
  addComment: function () {
    const content = this.data.commentInput.trim()
    if (!content) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }

    const that = this
    wx.cloud.callFunction({
      name: 'comment-add',
      data: {
        task_id: this.data.taskId,
        content: content
      }
    }).then(res => {
      if (res.result.success) {
        // 预计算 timeText
        const newComment = {
          ...res.result.comment,
          timeText: that.formatDateTime(res.result.comment.created_at)
        }
        that.setData({
          commentInput: '',
          comments: [newComment, ...that.data.comments]
        })
        wx.showToast({ title: '评论成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    })
  },

  // 开始任务（待办→进行中）
  startTask: function () {
    const that = this
    
    wx.showLoading({ title: '提交中...' })
    
    wx.cloud.callFunction({
      name: 'task-update',
      data: {
        task_id: this.data.taskId,
        status: 'in_progress'
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '已开始', icon: 'success' })
        that.loadTask()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    })
  },

  // 完成任务
  completeTask: function () {
    const that = this
    
    wx.showLoading({ title: '提交中...' })
    
    // 先更新子任务进度
    that.loadSubtaskProgress()
    
    // 检查子任务是否全部完成
    setTimeout(() => {
      wx.hideLoading()
      if (that.data.subtaskProgress.total > 0 && that.data.subtaskProgress.progress < 100) {
        // 有子任务且未完成，禁止直接完成主任务
        wx.showModal({
          title: '子任务未完成',
          content: `还有 ${that.data.subtaskProgress.total - that.data.subtaskProgress.completed} 个子任务未完成，请先完成所有子任务`,
          showCancel: false,
          confirmText: '我知道了'
        })
      } else {
        that.showCompleteModal()
      }
    }, 500)
  },

  // 异常上报
  reportException: function () {
    const that = this
    const isSubtask = this.data.task?.is_subtask
    
    wx.showModal({
      title: isSubtask ? '子任务异常上报' : '任务异常上报',
      content: isSubtask 
        ? '请选择处理方式' 
        : '请简要说明遇到的异常情况',
      editable: !isSubtask,
      placeholderText: '例如：资源不足/需求变更/技术难点...',
      confirmText: isSubtask ? '下一步' : '提交',
      success: (res) => {
        if (res.confirm) {
          if (isSubtask) {
            // 子任务：显示流转选项
            that.showSubtaskExceptionOptions()
          } else {
            // 主任务：申请延期
            const exceptionText = (res.content || '').trim()
            
            if (!exceptionText) {
              wx.showToast({ title: '请填写异常说明', icon: 'none' })
              that.reportException()
              return
            }
            
            that.submitMainTaskException(exceptionText)
          }
        }
      }
    })
  },

  // 子任务异常处理选项
  showSubtaskExceptionOptions: function () {
    const that = this
    
    wx.showActionSheet({
      itemList: ['申请延长完成时间', '转交给其他人'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 申请延期
          that.showSubtaskExtendModal()
        } else if (res.tapIndex === 1) {
          // 转交
          that.showSubtaskTransferModal()
        }
      }
    })
  },

  // 子任务申请延期
  showSubtaskExtendModal: function () {
    const that = this
    
    wx.showModal({
      title: '申请延长完成时间',
      content: '请输入新的截止日期（格式：YYYY-MM-DD）',
      editable: true,
      placeholderText: '例如：2026-03-30',
      success: (res) => {
        if (res.confirm) {
          const newDate = (res.content || '').trim()
          
          if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
            wx.showToast({ title: '日期格式不正确', icon: 'none' })
            that.showSubtaskExtendModal()
            return
          }
          
          wx.showLoading({ title: '提交中...' })
          
          wx.cloud.callFunction({
            name: 'subtask-update',
            data: {
              subtask_id: this.data.taskId,
              require_date: newDate
            }
          }).then(res => {
            wx.hideLoading()
            if (res.result.success) {
              wx.showToast({ title: '延期申请已提交', icon: 'success' })
              that.loadSubtask()
            } else {
              wx.showToast({ title: res.result.message, icon: 'none' })
            }
          })
        }
      }
    })
  },

  // 子任务转交
  showSubtaskTransferModal: function () {
    const that = this
    const db = wx.cloud.database()
    
    // 加载团队成员列表
    db.collection('users').where({
      organization_id: app.globalData.organization_id || ''
    }).field({
      openid: true,
      nickname: true
    }).get().then(res => {
      const members = res.data.filter(u => u.openid !== app.globalData.openid)
      
      if (members.length === 0) {
        wx.showToast({ title: '暂无可转交的成员', icon: 'none' })
        return
      }
      
      wx.showActionSheet({
        itemList: members.map(m => m.nickname),
        success: (res) => {
          const targetMember = members[res.tapIndex]
          
          wx.showModal({
            title: '确认转交',
            content: `确定将子任务转交给 ${targetMember.nickname} 吗？`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.showLoading({ title: '转交中...' })
                
                wx.cloud.callFunction({
                  name: 'subtask-update',
                  data: {
                    subtask_id: this.data.taskId,
                    executor_id: targetMember.openid
                  }
                }).then(res => {
                  wx.hideLoading()
                  if (res.result.success) {
                    wx.showToast({ title: '转交成功', icon: 'success' })
                    that.loadSubtask()
                  } else {
                    wx.showToast({ title: res.result.message, icon: 'none' })
                  }
                })
              }
            }
          })
        }
      })
    })
  },

  // 主任务异常上报（申请延期）
  submitMainTaskException: function (exceptionText) {
    const that = this
    
    wx.showLoading({ title: '提交中...' })
    
    // 云函数参数名要用 exception_reason，不是 exception_text
    wx.cloud.callFunction({
      name: 'task-exception',
      data: {
        task_id: this.data.taskId,
        exception_reason: exceptionText
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '上报成功', icon: 'success' })
        that.loadTask()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    })
  },

  // 显示完成弹窗
  showCompleteModal: function () {
    const that = this
    
    wx.showModal({
      title: '确认完成',
      content: '确定完成该任务吗？',
      editable: true,
      placeholderText: '填写完成总结（必填）',
      success: (res) => {
        if (res.confirm) {
          const completionNote = (res.content || '').trim()
          
          // 验证必填
          if (!completionNote) {
            wx.showToast({ title: '请填写完成总结', icon: 'none' })
            return
          }
          
          // 检查是否逾期（逾期会低于 80 分）
          const task = that.data.task
          const isOverdue = task && task.require_date && new Date(task.require_date) < new Date()
          
          if (isOverdue) {
            // 逾期任务，需要填写复盘
            that.showReviewModal(completionNote)
          } else {
            that.submitComplete(completionNote)
          }
        }
      }
    })
  },

  // 显示复盘弹窗（逾期时）
  showReviewModal: function (completionNote) {
    // 跳转到编辑页填写完整的复盘信息
    wx.showModal({
      title: '任务复盘',
      content: '任务已逾期，需要填写学习收获和归因分析',
      showCancel: true,
      confirmText: '去填写',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到编辑页，传递 completionNote
          wx.navigateTo({
            url: `/pages/edit/edit?id=${this.data.taskId}&completionNote=${encodeURIComponent(completionNote)}`
          })
        }
        // 用户取消则不做任何操作
      }
    })
  },

  // 提交完成
  submitComplete: function (completionNote, reviewText = '') {
    const that = this
    
    wx.showLoading({ title: '提交中...' })
    
    wx.cloud.callFunction({
      name: 'task-update',
      data: {
        task_id: that.data.taskId,
        status: 'completed',
        completion_note: completionNote,
        review_text: reviewText
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '完成成功', icon: 'success' })
        // 重新加载数据
        that.loadTask()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    })
  },

  // 跳转到子任务管理
  goToSubtaskManage: function () {
    wx.navigateTo({
      url: `/pages/subtask-manage/subtask-manage?id=${this.data.taskId}`
    })
  },

  // 跳转到子任务详情
  goToSubtaskDetail: function (e) {
    const subtaskId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${subtaskId}`
    })
  },

  // 更多菜单
  toggleMoreMenu: function () {
    this.setData({
      showMoreMenu: !this.data.showMoreMenu
    })
  },

  // 编辑任务
  editTask: function () {
    this.setData({ showMoreMenu: false })
    wx.navigateTo({
      url: `/pages/edit/edit?id=${this.data.taskId}`
    })
  },

  // 删除任务
  deleteTask: function () {
    const that = this
    this.setData({ showMoreMenu: false })
    
    wx.showModal({
      title: '确认删除',
      content: '确定删除该任务吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#FF5252',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          
          wx.cloud.callFunction({
            name: 'task-delete',
            data: {
              task_id: this.data.taskId
            }
          }).then(res => {
            wx.hideLoading()
            if (res.result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            } else {
              wx.showToast({ title: res.result.message, icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error('删除失败:', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 返回
  onNavigateBack: function () {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 格式化日期时间
  formatDateTime: function (timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    // 今天
    if (diff < 86400000 && date.getDate() === now.getDate()) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    
    // 昨天
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (diff < 172800000 && date.getDate() === yesterday.getDate()) {
      return '昨天'
    }
    
    // 更早
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
})
