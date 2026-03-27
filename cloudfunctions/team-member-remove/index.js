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
  const { team_id, member_openid } = event

  try {
    if (!team_id || !member_openid) {
      return {
        success: false,
        message: '参数不完整'
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

    // 验证权限：只有创建者可以移除成员
    if (team.leader_id !== OPENID) {
      return {
        success: false,
        message: '只有团队创建者可以移除成员'
      }
    }

    // 不能移除自己
    if (member_openid === OPENID) {
      return {
        success: false,
        message: '不能移除自己'
      }
    }

    // 更新成员列表
    const updatedMembers = (team.members || []).filter(id => id !== member_openid)
    const updatedDetails = (team.member_details || []).filter(m => m.openid !== member_openid)

    // 更新数据库
    await db.collection('teams').doc(team_id).update({
      data: {
        members: updatedMembers,
        member_details: updatedDetails,
        updated_at: new Date()
      }
    })

    return {
      success: true,
      message: '成员已移除'
    }

  } catch (err) {
    console.error('移除成员失败:', err)
    return {
      success: false,
      message: '移除成员失败：' + err.message,
      errCode: err.errCode
    }
  }
}
