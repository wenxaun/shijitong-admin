// pages/team/team.js
const app = getApp()

Page({
  data: {
    userInfo: {},
    teamMembers: [],
    canManageTeam: false,
    myRole: '',
    myDepartment: ''
  },

  onLoad: function () {
    this.loadMyInfo()
    this.loadTeamMembers()
  },

  // 加载我的信息
  loadMyInfo: function () {
    const openid = app.globalData.openid
    if (!openid) {
      console.error('团队页：openid 为空')
      return
    }

    const db = wx.cloud.database()
    db.collection('users').where({ openid }).get().then(res => {
      console.log('团队页：用户数据', res.data)
      
      if (res.data.length > 0) {
        const user = res.data[0]
        const role = user.role || 'executor'
        
        // 判断是否有团队管理权限（所有用户都可以创建/管理团队）
        const canManage = true
        
        this.setData({
          userInfo: {
            _id: user._id,
            nickname: user.nickname || user.nick_name || '微信用户',
            department: user.department || '',
            manager_name: user.manager_name || '',
            organization_id: user.organization_id || user.org_id || '',
            role: role,
            role_name: this.getRoleName(role),
            can_manage_team: user.can_manage_team
          },
          canManageTeam: canManage,
          myRole: role,
          myDepartment: user.department || '',
          organization_id: user.organization_id || user.org_id || ''
        })
        
        console.log('团队页：设置数据', this.data)
      } else {
        console.error('团队页：未找到用户数据')
        wx.showToast({ title: '请先登录', icon: 'none' })
      }
    }).catch(err => {
      console.error('团队页：加载用户失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 加载团队成员
  loadTeamMembers: function () {
    const db = wx.cloud.database()
    const orgId = this.data.organization_id
    
    console.log('团队页：加载成员，orgId=', orgId)
    
    // 查询同组织成员
    let query = {}
    if (orgId) {
      // 有组织时查询同组织成员
      query.organization_id = orgId
    } else {
      // 无组织时显示空列表
      this.setData({ teamMembers: [] })
      return
    }
    
    db.collection('users').where(query).limit(50).get().then(res => {
      console.log('团队页：成员数据', res.data)
      
      const members = res.data.map(u => ({
        _id: u._id,
        openid: u.openid,
        nickname: u.nickname || u.nick_name || '微信用户',
        department: u.department || '',
        manager_name: u.manager_name || '',
        role: u.role || 'executor',
        role_name: this.getRoleName(u.role || 'executor'),
        can_manage_team: u.can_manage_team
      }))
      
      // 排除自己
      const openid = app.globalData.openid
      const filtered = members.filter(m => m.openid !== openid)
      
      this.setData({ teamMembers: filtered })
    }).catch(err => {
      console.error('团队页：加载成员失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 获取角色名称
  getRoleName: function (role) {
    const roles = {
      'admin': '管理员',
      'manager': '部门经理',
      'publisher': '发布人',
      'executor': '执行人'
    }
    return roles[role] || '普通成员'
  },

  // 判断是否可以编辑成员
  canEditMember: function (member) {
    // 管理员可以编辑所有人
    if (this.data.myRole === 'admin') return true
    
    // 部门经理可以编辑下级
    if (this.data.myRole === 'manager') {
      // 不能编辑同级或上级
      if (member.role === 'admin' || member.role === 'manager') return false
      return true
    }
    
    return false
  },

  // 创建团队
  createTeam: function () {
    const that = this
    const userInfo = this.data.userInfo
    
    wx.showModal({
      title: '创建团队',
      editable: true,
      placeholderText: '请输入团队/组织名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const orgName = res.content.trim()
          
          // 前端先验证字数
          if (orgName.length < 2) {
            wx.showToast({ title: '组织名称至少 2 个字', icon: 'none' })
            that.createTeam()
            return
          }
          
          wx.showLoading({ title: '创建中...' })
          
          // 云函数参数名要用 name，不是 orgName
          wx.cloud.callFunction({
            name: 'org-create',
            data: {
              name: orgName,
              creatorOpenid: app.globalData.openid
            }
          }).then(orgRes => {
            wx.hideLoading()
            if (orgRes.result.success) {
              wx.showToast({ title: '创建成功', icon: 'success' })
              // 更新当前用户信息
              that.loadMyInfo()
              that.loadTeamMembers()
            } else {
              wx.showToast({ title: orgRes.result.message || '创建失败', icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error('创建团队失败:', err)
            wx.showToast({ title: '创建失败', icon: 'none' })
          })
        } else if (res.cancel) {
          // 用户取消
        } else {
          wx.showToast({ title: '请输入团队名称', icon: 'none' })
          that.createTeam()
        }
      }
    })
  },

  // 添加成员
  addMember: function () {
    const that = this
    const orgId = this.data.organization_id
    
    if (!orgId) {
      wx.showToast({ title: '请先创建团队', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '添加成员',
      editable: true,
      placeholderText: '请输入成员手机号',
      success: (res) => {
        if (res.confirm && res.content) {
          wx.showLoading({ title: '添加中...' })
          
          // 查找用户
          wx.cloud.database().collection('users').where({
            phone: res.content
          }).get().then(userRes => {
            wx.hideLoading()
            if (userRes.data.length > 0) {
              const targetUser = userRes.data[0]
              
              // 检查是否已在团队中
              if (targetUser.organization_id === orgId) {
                wx.showToast({ title: '已在团队中', icon: 'none' })
                return
              }
              
              // 更新用户信息，加入团队
              wx.cloud.database().collection('users').doc(targetUser._id).update({
                data: {
                  organization_id: orgId,
                  department: that.data.myDepartment || '默认部门'
                }
              }).then(() => {
                wx.showToast({ title: '添加成功', icon: 'success' })
                that.loadTeamMembers()
              }).catch(err => {
                console.error('添加成员失败:', err)
                wx.showToast({ title: '添加失败', icon: 'none' })
              })
            } else {
              wx.showToast({ title: '未找到该用户', icon: 'none' })
            }
          }).catch(err => {
            console.error('查找用户失败:', err)
            wx.showToast({ title: '查找失败', icon: 'none' })
          })
        }
      }
    })
  },

  editMember: function (e) {
    const member = e.currentTarget.dataset.member
    wx.navigateTo({
      url: `/pages/team-edit/team-edit?openid=${member.openid}`
    })
  }
})
