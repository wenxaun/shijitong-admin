// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 默认权限配置
const DEFAULT_PERMISSIONS = {
  owner: {
    can_create_task: true,
    can_assign_task: true,
    can_view_all_tasks: true,
    can_edit_team: true,
    can_invite_member: true,
    can_remove_member: true
  },
  admin: {
    can_create_task: true,
    can_assign_task: true,
    can_view_all_tasks: true,
    can_edit_team: false,
    can_invite_member: true,
    can_remove_member: false
  },
  member: {
    can_create_task: true,
    can_assign_task: false,
    can_view_all_tasks: false,
    can_edit_team: false,
    can_invite_member: false,
    can_remove_member: false
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { team_id, member_openid, role } = event

  try {
    if (!team_id || !member_openid || !role) {
      return {
        success: false,
        message: '参数不完整'
      }
    }

    // 验证角色
    if (!['owner', 'admin', 'member'].includes(role)) {
      return {
        success: false,
        message: '无效的角色类型'
      }
    }

    // 获取团队详情
    const teamResult = await db.collection('teams').doc(team_id).get()
    
    if (!teamResult.data) {
      return {
        success: false,
        message: '团队不存在'
      }
    }

    const team = teamResult.data

    // 验证权限：只有创建者可以修改成员角色
    if (team.leader_id !== OPENID) {
      return {
        success: false,
        message: '只有团队创建者可以修改成员角色'
      }
    }

    // 不能修改自己的角色
    if (member_openid === OPENID) {
      return {
        success: false,
        message: '不能修改自己的角色'
      }
    }

    // 更新成员详情
    const memberDetails = team.member_details || []
    const updatedDetails = memberDetails.map(m => {
      if (m.openid === member_openid) {
        return {
          ...m,
          role: role,
          permissions: DEFAULT_PERMISSIONS[role]
        }
      }
      return m
    })

    // 更新数据库
    await db.collection('teams').doc(team_id).update({
      data: {
        member_details: updatedDetails,
        updated_at: new Date()
      }
    })

    return {
      success: true,
      message: '成员角色已更新'
    }

  } catch (err) {
    console.error('更新成员角色失败:', err)
    return {
      success: false,
      message: '更新成员角色失败：' + err.message,
      errCode: err.errCode
    }
  }
}
