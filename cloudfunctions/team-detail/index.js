// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

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

    // 获取发布人名称
    let leaderName = '未知'
    if (team.leader_id) {
      const leaderResult = await db.collection('users')
        .where({ openid: team.leader_id })
        .limit(1)
        .get()
      if (leaderResult.data.length > 0) {
        leaderName = leaderResult.data[0].nick_name || '微信用户'
      }
    }

    // 构建 member_details
    let memberDetails = team.member_details || []
    
    // 如果没有 member_details，从 users 集合查询
    if (memberDetails.length === 0 && team.members && team.members.length > 0) {
      const usersResult = await db.collection('users')
        .where({
          openid: _.in(team.members)
        })
        .get()

      memberDetails = usersResult.data.map(user => ({
        openid: user.openid,
        nickname: user.nick_name || '微信用户',
        role: team.leader_id === user.openid ? 'owner' : 'member',
        joined_at: team.created_at
      }))
    }

    return {
      success: true,
      data: {
        team: {
          _id: team._id,
          name: team.name,
          description: team.description || '',
          leader_id: team.leader_id,
          leader_name: leaderName,
          members: team.members || [],
          member_details: memberDetails,
          invite_code: team.invite_code || '',
          created_at: formatDate(team.created_at)
        }
      }
    }

  } catch (err) {
    console.error('获取团队详情失败:', err)
    return {
      success: false,
      message: '获取团队详情失败：' + err.message,
      errCode: err.errCode
    }
  }
}

// 日期格式化辅助函数
function formatDate(date) {
  if (!date) return null
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
