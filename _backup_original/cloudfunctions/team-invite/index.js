// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  try {
    const {
      team_id,
      invitee_openid,
      invitee_username,
      role = 'member'
    } = event
    
    // 获取邀请人信息
    const inviterRes = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (inviterRes.data.length === 0) {
      return {
        success: false,
        message: '用户未登录'
      }
    }
    
    const inviter = inviterRes.data[0]
    
    // 获取团队信息
    const teamRes = await db.collection('teams').doc(team_id).get()
    
    if (!teamRes.data) {
      return {
        success: false,
        message: '团队不存在'
      }
    }
    
    const team = teamRes.data
    
    // 权限检查：只有团队负责人、管理员可以邀请
    if (team.leader_id !== OPENID && !['creator', 'admin'].includes(inviter.role)) {
      return {
        success: false,
        message: '无权限邀请成员'
      }
    }
    
    // 检查被邀请人是否存在
    let invitee
    if (invitee_openid) {
      const inviteeRes = await db.collection('users').where({
        openid: invitee_openid
      }).get()
      
      if (inviteeRes.data.length === 0) {
        return {
          success: false,
          message: '该用户不存在'
        }
      }
      invitee = inviteeRes.data[0]
    } else if (invitee_username) {
      const inviteeRes = await db.collection('users').where({
        username: invitee_username
      }).get()
      
      if (inviteeRes.data.length === 0) {
        return {
          success: false,
          message: '该用户名不存在'
        }
      }
      invitee = inviteeRes.data[0]
      invitee_openid = invitee.openid
    } else {
      return {
        success: false,
        message: '请提供被邀请人的 OPENID 或用户名'
      }
    }
    
    // 检查是否已是成员
    const existMember = await db.collection('team_members').where({
      team_id: team_id,
      user_id: invitee_openid,
      status: 'active'
    }).get()
    
    if (existMember.data.length > 0) {
      return {
        success: false,
        message: '该用户已是团队成员'
      }
    }
    
    // 创建团队成员关系
    const result = await db.collection('team_members').add({
      data: {
        team_id: team_id,
        user_id: invitee_openid,
        user_name: invitee.nickname || invitee.username,
        role: role,
        title: '',
        joined_at: new Date(),
        joined_by: OPENID,
        status: 'active'
      }
    })
    
    // 更新团队成员列表
    await db.collection('teams').doc(team_id).update({
      data: {
        member_ids: db.command.push(invitee_openid),
        member_count: db.command.inc(1),
        updated_at: new Date()
      }
    })
    
    // 更新被邀请人的部门信息（如果团队关联部门）
    if (team.department_id) {
      await db.collection('users').doc(invitee._id).update({
        data: {
          department_id: team.department_id,
          department_path: team.department_path || '',
          updated_at: new Date()
        }
      })
    }
    
    return {
      success: true,
      message: `已成功邀请 ${invitee.nickname || invitee.username} 加入团队！`,
      data: {
        member_id: result._id,
        invitee_name: invitee.nickname || invitee.username,
        role: role
      }
    }
    
  } catch (err) {
    console.error('邀请成员失败:', err)
    return {
      success: false,
      message: '邀请失败：' + err.message,
      errCode: err.errCode
    }
  }
}
