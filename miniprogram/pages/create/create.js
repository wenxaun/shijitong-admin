// pages/create/create.js
const app = getApp()

Page({
  data: {
    taskName: '',
    taskDescription: '',
    priority: 'P1',
    category: '',
    executorList: [],
    executorIndex: -1, // -1 表示默认为自己
    requireDate: '',
    // 语音识别相关
    isRecording: false,
    voiceTarget: '', // 'taskName' or 'taskDescription'
    recorderManager: null
  },

  onLoad: function () {
    this.loadExecutorList()
  },

  // 加载执行人列表
  loadExecutorList: function () {
    const db = wx.cloud.database()
    db.collection('users').orderBy('created_at', 'asc').get().then(res => {
      const users = res.data.map(u => ({
        id: u._id,
        openid: u.openid,
        name: u.nickname || '微信用户'
      }))
      
      this.setData({ executorList: users })
    }).catch(err => {
      console.error('加载用户列表失败:', err)
    })
  },

  onTaskNameInput: function (e) {
    this.setData({ taskName: e.detail.value })
  },

  onDescriptionInput: function (e) {
    this.setData({ taskDescription: e.detail.value })
  },

  setPriority: function (e) {
    const priority = e.currentTarget.dataset.value
    this.setData({ priority })
  },

  onCategoryInput: function (e) {
    this.setData({ category: e.detail.value })
  },

  onExecutorChange: function (e) {
    const index = e.detail.value
    this.setData({ executorIndex: index })
  },

  onDateChange: function (e) {
    this.setData({ requireDate: e.detail.value })
  },

  submitTask: function () {
    // 验证必填字段
    if (!this.data.taskName.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }

    if (!this.data.requireDate) {
      wx.showToast({ title: '请选择要求完成日期', icon: 'none' })
      return
    }

    // 获取执行人 ID
    let executorId = null
    if (this.data.executorIndex >= 0) {
      executorId = this.data.executorList[this.data.executorIndex].openid
    }

    // 调用云函数创建任务
    wx.showLoading({ title: '创建中...' })

    wx.cloud.callFunction({
      name: 'task-create',
      data: {
        task_name: this.data.taskName.trim(),
        task_description: this.data.taskDescription.trim(),
        priority: this.data.priority,
        category: this.data.category.trim(),
        executor_id: executorId, // 传入选中的执行人
        require_date: this.data.requireDate
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' })
        
        // 清空表单
        this.clearForm()
        
        // 跳转回空白的创建任务页（支持连续发布）
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/create/create'
          })
        }, 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('创建任务失败:', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    })
  },

  // 清空表单
  clearForm: function () {
    this.setData({
      taskName: '',
      taskDescription: '',
      priority: 'P1',
      category: '',
      executorIndex: -1,
      requireDate: ''
    })
  },

  // 页面显示时清空表单（每次进入都清空）
  onShow: function () {
    this.clearForm()
  },

  // 初始化录音管理器
  initRecorder: function () {
    if (!this.data.recorderManager) {
      const recorderManager = wx.getRecorderManager()
      
      // 录音开始
      recorderManager.onStart(() => {
        console.log('录音开始')
      })
      
      // 录音结束
      recorderManager.onStop((res) => {
        console.log('录音结束', res)
        this.setData({ isRecording: false })
        
        // 录音文件可以用于上传到服务器进行识别
        // 这里使用临时文件路径
        if (res.tempFilePath) {
          this.handleVoiceInput(res.tempFilePath)
        }
      })
      
      // 录音错误
      recorderManager.onError((err) => {
        console.error('录音错误', err)
        this.setData({ isRecording: false })
        wx.showToast({ title: '录音失败', icon: 'none' })
      })
      
      this.setData({ recorderManager })
    }
  },

  // 切换语音输入
  toggleVoice: function (e) {
    const target = e.currentTarget.dataset.target
    
    if (!this.data.recorderManager) {
      this.initRecorder()
    }
    
    if (this.data.isRecording) {
      // 停止录音
      this.data.recorderManager.stop()
      this.setData({ isRecording: false, voiceTarget: '' })
    } else {
      // 开始录音
      this.setData({ isRecording: true, voiceTarget: target })
      
      this.data.recorderManager.start({
        duration: 60000, // 最长 60 秒
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'mp3'
      })
      
      wx.showToast({
        title: '请说话',
        icon: 'none',
        duration: 60000
      })
    }
  },

  // 处理语音输入（腾讯云语音识别 + NLP 解析）
  handleVoiceInput: function (tempFilePath) {
    wx.showLoading({ title: '识别中…' })
    
    // 1. 上传录音文件到云存储
    const uploadTask = wx.cloud.uploadFile({
      cloudPath: `voice/${Date.now()}.mp3`,
      filePath: tempFilePath,
      success: (res) => {
        console.log('上传成功', res.fileID)
        
        // 2. 调用云函数进行语音识别和 NLP 解析
        wx.showLoading({ title: '解析中…' })
        
        wx.cloud.callFunction({
          name: 'voice-recognize',
          data: {
            audioFilePath: res.fileID
          }
        }).then(callRes => {
          wx.hideLoading()
          console.log('识别结果', callRes)
          
          if (callRes.result.success) {
            const { originalText, parsed } = callRes.result.data
            
            // 3. 显示识别结果确认
            wx.showModal({
              title: '识别完成',
              content: `识别内容：${originalText}\n\n任务名称：${parsed.taskName}\n时间：${parsed.requireDate || '未识别'}\n优先级：${parsed.priority === 'P0' ? '紧急' : parsed.priority === 'P1' ? '重要' : '普通'}`,
              confirmText: '确认',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 4. 自动回填表单
                  this.fillTaskForm(parsed)
                }
              }
            })
          } else {
            wx.showToast({
              title: callRes.result.message || '识别失败',
              icon: 'none'
            })
          }
        }).catch(err => {
          wx.hideLoading()
          console.error('识别失败', err)
          wx.showToast({
            title: '识别失败',
            icon: 'none'
          })
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('上传失败', err)
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    })
  },

  // 自动回填表单
  fillTaskForm: function (parsed) {
    const formData = {}
    
    // 任务名称
    if (parsed.taskName) {
      formData.taskName = parsed.taskName
    }
    
    // 任务描述
    if (parsed.taskDescription) {
      formData.taskDescription = parsed.taskDescription
    }
    
    // 优先级
    if (parsed.priority) {
      formData.priority = parsed.priority
    }
    
    // 分类
    if (parsed.category) {
      formData.category = parsed.category
    }
    
    // 要求完成日期
    if (parsed.requireDate) {
      formData.requireDate = parsed.requireDate
    }
    
    // 执行人（需要查找对应的 openid）
    if (parsed.executorName && this.data.executorList.length > 0) {
      const executor = this.data.executorList.find(u => 
        u.name.includes(parsed.executorName)
      )
      if (executor) {
        formData.executorIndex = this.data.executorList.indexOf(executor)
      }
    }
    
    // 更新表单
    this.setData(formData)
    
    wx.showToast({
      title: '已自动填写',
      icon: 'success'
    })
  },

  // 页面卸载时停止录音
  onUnload: function () {
    if (this.data.recorderManager && this.data.isRecording) {
      this.data.recorderManager.stop()
    }
  }
})
