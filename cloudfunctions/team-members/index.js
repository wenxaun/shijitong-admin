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
    // 如果指定了 team_id，获取该团队成员
    // 否则获取当前用户所在团队的所有成员
    let targetTeamId = team_id

    if (!targetTeamId) {
      // 查找用户所在的团队
      const userTeamResult = await db.collection('teams')
        .where({
          members: _.in([OPENID])
        })
        .limit(1)
        .get()

      if (userTeamResult.data.length === 0) {
        // 没有团队，返回模拟数据
        return {
          success: true,
          data: {
            members: [
              { openid: OPENID, nickname: '我' }
            ]
          }
        }
      }
      targetTeamId = userTeamResult.data[0]._id
    }

    // 获取团队详情
    const teamResult = await db.collection('teams').doc(targetTeamId).get()
    
    if (!teamResult.data) {
      return {
        success: false,
        message: '团队不存在'
      }
    }

    const team = teamResult.data

    // 如果有 member_details，直接返回
    if (team.member_details && team.member_details.length > 0) {
      return {
        success: true,
        data: {
          members: team.member_details.map(m => ({
            openid: m.openid,
            nickname: m.nickname || '微信用户',
            role: m.role || 'member'
          }))
        }
      }
    }

    // 否则从 users 集合查询
    if (!team.members || team.members.length === 0) {
      return {
        success: true,
        data: { members: [] }
      }
    }

    const usersResult = await db.collection('users')
      .where({
        openid: _.in(team.members)
      })
      .get()

    const members = usersResult.data.map(user => ({
      openid: user.openid,
      nickname: user.nick_name || '微信用户',
      role: team.leader_id === user.openid ? 'owner' : 'member'
    }))

    return {
      success: true,
      data: { members }
    }

  } catch (err) {
    console.error('获取团队成员失败:', err)
    return {
      success: false,
      message: '获取团队成员失败：' + err.message,
      errCode: err.errCode
    }
  }
}
