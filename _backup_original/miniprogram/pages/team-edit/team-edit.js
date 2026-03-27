// pages/team-edit/team-edit.js
const app = getApp()

Page({
  data: {
    openid: '',
    department: '',
    managerList: [],
    managerIndex: -1,
    role: 'executor',
    roleDesc: '只能执行任务，不能创建任务',
    canManageTeam: false,
    myRole: ''
  },

  onLoad: function (options) {
    if (options.openid) {
      this.setData({ openid: options.openid })
      this.loadMemberInfo()
      this.loadManagerList()
    }
  },

  // 加载成员信息
  loadMemberInfo: function () {
    const db = wx.cloud.database()
    db.collection('users').where({ openid: this.data.openid }).get().then(res => {
      if (res.data.length > 0) {
        const user = res.data[0]
        
        // 获取当前用户角色
        const myOpenid = app.globalData.openid
        db.collection('users').where({ openid: myOpenid }).get().then(myRes => {
          const myRole = myRes.data.length > 0 ? myRes.data[0].role : 'executor'
          
          this.setData({
            department: user.department || '',
            role: user.role || 'executor',
            canManageTeam: user.can_manage_team || false,
            myRole: myRole,
            roleDesc: this.getRoleDesc(user.role || 'executor')
          })
          
          // 查找上级索引
          if (user.manager_id && this.data.managerList.length > 0) {
            const index = this.data.managerList.findIndex(m => m.openid === user.manager_id)
            if (index >= 0) {
              this.setData({ managerIndex: index })
            }
          }
        })
      }
    })
  },

  // 加载上级列表
  loadManagerList: function () {
    const db = wx.cloud.database()
    db.collection('users').where({
      role: { $in: ['admin', 'manager'] }
    }).limit(50).get().then(res => {
      const managers = res.data.map(u => ({
        openid: u.openid,
        name: u.nickname || '微信用户',
        role: u.role
      }))
      this.setData({ managerList: managers })
    })
  },

  // 获取角色描述
  getRoleDesc: function (role) {
    const descs = {
      'executor': '只能执行任务，不能创建任务',
      'publisher': '可以创建和分配任务',
      'manager': '可以管理部门成员和任务',
      'admin': '管理员，拥有所有权限'
    }
    return descs[role] || ''
  },

  onDepartmentInput: function (e) {
    this.setData({ department: e.detail.value })
  },

  onManagerChange: function (e) {
    const index = e.detail.value
    this.setData({ managerIndex: index })
  },

  setRole: function (e) {
    const role = e.currentTarget.dataset.value
    
    // 权限限制：下级不能超过上级
    if (this.data.myRole !== 'admin') {
      if (role === 'admin') {
        wx.showToast({ title: '无权限设置管理员', icon: 'none' })
        return
      }
      if (this.data.myRole !== 'manager' && role === 'manager') {
        wx.showToast({ title: '无权限设置部门经理', icon: 'none' })
        return
      }
    }
    
    this.setData({ 
      role,
      roleDesc: this.getRoleDesc(role)
    })
  },

  toggleManageTeam: function () {
    this.setData({ canManageTeam: !this.data.canManageTeam })
  },

  submitEdit: function () {
    wx.showLoading({ title: '保存中...' })

    const manager = this.data.managerIndex >= 0 ? this.data.managerList[this.data.managerIndex] : null

    wx.cloud.callFunction({
      name: 'team-update',
      data: {
        target_openid: this.data.openid,
        department: this.data.department,
        manager_id: manager ? manager.openid : null,
        manager_name: manager ? manager.name : '',
        role: this.data.role,
        can_manage_team: this.data.canManageTeam
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  }
})
