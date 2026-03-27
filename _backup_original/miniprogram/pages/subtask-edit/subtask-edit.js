// pages/subtask-edit/subtask-edit.js
const app = getApp()

Page({
  data: {
    subtaskId: '',
    currentExecutorId: '',
    parentTaskId: '',
    parentTaskName: '',
    parentTaskRequireDate: '',
    taskName: '',
    taskDescription: '',
    executorList: [],
    executorIndex: -1,
    requireDate: '',
    minDate: '',
    maxDate: '',
    collaborators: [],
    flowHistory: [],
    canDelete: false
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ subtaskId: options.id })
      this.loadSubtask()
    }
    
    // 设置今天为最小日期
    const today = new Date()
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    this.setData({ minDate })
  },

  // 加载子任务信息
  loadSubtask: function () {
    const that = this
    wx.showLoading({ title: '加载中...' })

    wx.cloud.database().collection('tasks').doc(this.data.subtaskId).get().then(res => {
      if (res.data) {
        const task = res.data
        
        that.setData({
          currentExecutorId: task.current_executor || task.executor_id,
          parentTaskId: task.parent_task_id,
          taskName: task.task_name,
          taskDescription: task.task_description || '',
          requireDate: that.formatDate(task.require_date),
          collaborators: task.collaborators || [],
          flowHistory: that.formatFlowHistory(task.flow_history || [])
        })

        // 加载流转历史中的用户名称
        that.loadFlowHistoryNames(task.flow_history || [])

        // 判断是否能删除（只有发布人或执行人可删除）
        const currentOpenid = app.globalData.openid
        const canDelete = (task.publisher_id === currentOpenid || task.executor_id === currentOpenid)
        that.setData({ canDelete })

        // 加载主任务信息
        that.loadParentTask(task.parent_task_id)
        
        // 加载团队成员
        that.loadTeamMembers()
        
        wx.hideLoading()
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('加载子任务失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 加载主任务信息
  loadParentTask: function (parentTaskId) {
    const that = this
    
    wx.cloud.database().collection('tasks').doc(parentTaskId).get().then(res => {
      if (res.data) {
        const parentTask = res.data
        that.setData({
          parentTaskName: parentTask.task_name,
          parentTaskRequireDate: that.formatDate(parentTask.require_date),
          maxDate: that.formatDate(parentTask.require_date)
        })
      }
    })
  },

  // 加载团队成员
  loadTeamMembers: function () {
    const that = this
    
    wx.cloud.database().collection('users').where({
      openid: app.globalData.openid
    }).get().then(userRes => {
      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        
        if (user.organization_id) {
          wx.cloud.database().collection('users').where({
            organization_id: user.organization_id
          }).field({
            openid: true,
            nickname: true,
            avatar_url: true
          }).get().then(membersRes => {
            const members = membersRes.data
            
            // 设置当前执行人的索引
            const currentExecutorId = that.getCurrentExecutorId()
            const executorIndex = members.findIndex(m => m.openid === currentExecutorId)
            
            that.setData({
              executorList: members,
              executorIndex: executorIndex >= 0 ? executorIndex : -1
            })
          })
        } else {
          that.setData({
            executorList: [{
              openid: app.globalData.openid,
              nickname: '我'
            }],
            executorIndex: 0
          })
        }
      }
    })
  },

  // 获取当前执行人ID
  getCurrentExecutorId: function () {
    return this.data.currentExecutorId
  },

  // 格式化流转历史
  formatFlowHistory: function (flowHistory) {
    const that = this
    
    // 格式化日期，返回带时间戳的原始数据
    // 用户名称会在单独查询后通过 setData 更新
    return flowHistory.map(flow => ({
      ...flow,
      from_executor_name: '加载中...',
      to_executor_name: '加载中...',
      flow_date: that.formatDateTime(flow.flow_date)
    }))
  },

  // 加载流转历史用户名称
  loadFlowHistoryNames: function (flowHistory) {
    const that = this
    if (!flowHistory || flowHistory.length === 0) return
    
    // 获取所有涉及的 openid
    const openids = []
    flowHistory.forEach(flow => {
      if (flow.from_executor) openids.push(flow.from_executor)
      if (flow.to_executor) openids.push(flow.to_executor)
    })
    
    if (openids.length === 0) return
    
    // 批量获取用户名称
    wx.cloud.database().collection('users').where({
      openid: wx.cloud.database().command.in(openids)
    }).field({
      openid: true,
      nickname: true
    }).get().then(res => {
      const nameMap = {}
      res.data.forEach(u => {
        nameMap[u.openid] = u.nickname
      })
      
      // 更新 flowHistory 中的名称
      const updatedHistory = flowHistory.map(flow => ({
        ...flow,
        from_executor_name: nameMap[flow.from_executor] || '执行人',
        to_executor_name: nameMap[flow.to_executor] || '执行人'
      }))
      
      that.setData({ flowHistory: updatedHistory })
    })
  },

  // 任务名称输入
  onTaskNameInput: function (e) {
    this.setData({ taskName: e.detail.value })
  },

  // 描述输入
  onDescriptionInput: function (e) {
    this.setData({ taskDescription: e.detail.value })
  },

  // 执行人选择
  onExecutorChange: function (e) {
    this.setData({ executorIndex: parseInt(e.detail.value) })
  },

  // 日期选择
  onDateChange: function (e) {
    this.setData({ requireDate: e.detail.value })
  },

  // 添加协助人
  addCollaborator: function () {
    const that = this
    const currentCollaborators = this.data.collaborators
    
    // 排除已选择的协助人和当前执行人
    const availableMembers = this.data.executorList.filter(member => {
      const isAlreadyCollaborator = currentCollaborators.some(c => c.openid === member.openid)
      return !isAlreadyCollaborator
    })
    
    if (availableMembers.length === 0) {
      wx.showToast({ title: '没有可添加的成员', icon: 'none' })
      return
    }
    
    wx.showActionSheet({
      itemList: availableMembers.map(u => u.nickname),
      success: (res) => {
        const user = availableMembers[res.tapIndex]
        
        // 如果是修改模式（已有关注人），则替换
        if (currentCollaborators.length > 0) {
          wx.showModal({
            title: '确认',
            content: `确定将协助人修改为 ${user.nickname} 吗？`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                that.setData({
                  collaborators: [{ openid: user.openid, name: user.nickname }]
                })
              }
            }
          })
        } else {
          // 添加新协助人
          that.setData({
            collaborators: [...currentCollaborators, { openid: user.openid, name: user.nickname }]
          })
        }
      }
    })
  },

  // 移除协助人
  removeCollaborator: function (e) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认',
      content: '确定移除该协助人吗？',
      success: (res) => {
        if (res.confirm) {
          const collaborators = this.data.collaborators.filter((_, i) => i !== index)
          this.setData({ collaborators })
        }
      }
    })
  },

  // 保存修改
  saveSubtask: function () {
    const that = this

    // 验证必填字段
    if (!this.data.taskName.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }

    if (this.data.executorIndex < 0) {
      wx.showToast({ title: '请选择执行人', icon: 'none' })
      return
    }

    if (!this.data.requireDate) {
      wx.showToast({ title: '请选择截止日期', icon: 'none' })
      return
    }

    const executor = this.data.executorList[this.data.executorIndex]

    wx.showLoading({ title: '保存中...' })

    wx.cloud.callFunction({
      name: 'subtask-update',
      data: {
        subtask_id: this.data.subtaskId,
        task_name: this.data.taskName,
        task_description: this.data.taskDescription,
        executor_id: executor.openid,
        require_date: this.data.requireDate,
        collaborators: this.data.collaborators
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('保存子任务失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  // 删除子任务
  deleteSubtask: function () {
    const that = this
    
    wx.showModal({
      title: '确认删除',
      content: '确定删除此子任务吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#FF5252',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          
          wx.cloud.callFunction({
            name: 'subtask-delete',
            data: {
              subtask_id: this.data.subtaskId
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
            // 如果 subtask-delete 云函数不存在，尝试直接删除
            that.deleteSubtaskDirect()
          })
        }
      }
    })
  },

  // 直接删除（备用方法）
  deleteSubtaskDirect: function () {
    const that = this
    
    wx.cloud.database().collection('tasks').doc(this.data.subtaskId).remove()
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '删除成功', icon: 'success' })
        
        // 更新主任务的子任务计数
        wx.cloud.database().collection('tasks').doc(this.data.parentTaskId).update({
          data: {
            subtask_count: wx.cloud.database().command.inc(-1)
          }
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      })
      .catch(err => {
        wx.hideLoading()
        console.error('删除失败:', err)
        wx.showToast({ title: '删除失败', icon: 'none' })
      })
  },

  // 格式化日期
  formatDate: function (date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  // 格式化日期时间
  formatDateTime: function (date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
