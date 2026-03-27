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
  const { team_id } = event

  try {
    if (!team_id) {
      return {
        success: false,
        message: '团队ID不能为空'
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

    // 验证权限：只有创建者可以解散团队
    if (team.leader_id !== OPENID) {
      return {
        success: false,
        message: '只有团队创建者可以解散团队'
      }
    }

    // 删除团队
    await db.collection('teams').doc(team_id).remove()

    return {
      success: true,
      message: '团队已解散'
    }

  } catch (err) {
    console.error('解散团队失败:', err)
    return {
      success: false,
      message: '解散团队失败：' + err.message,
      errCode: err.errCode
    }
  }
}
