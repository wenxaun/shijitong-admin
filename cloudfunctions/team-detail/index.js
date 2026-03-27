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

  console.log('[team-detail] 开始查询团队详情, OPENID:', OPENID, 'team_id:', team_id)

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
    console.log('[team-detail] 团队基本信息:', team)

    // 获取发布人名称
    let leaderName = team.leader_name || '未知'
    if (!team.leader_name && team.leader_id) {
      const leaderResult = await db.collection('users')
        .where({ openid: team.leader_id })
        .limit(1)
        .get()
      if (leaderResult.data.length > 0) {
        leaderName = leaderResult.data[0].nickname || leaderResult.data[0].nick_name || '微信用户'
      }
    }

    // 构建 member_details - 优先使用存储的 member_details
    let memberDetails = team.member_details || []
    
    // 如果没有 member_details，尝试从 team_members 表查询
    if (memberDetails.length === 0) {
      console.log('[team-detail] member_details 为空，查询 team_members 表...')
      const membersRes = await db.collection('team_members')
        .where({ team_id: team_id })
        .get()
      
      if (membersRes.data.length > 0) {
        memberDetails = membersRes.data.map(m => ({
          openid: m.user_id,
          nickname: m.user_name || '微信用户',
          role: m.role === 'leader' ? 'owner' : m.role,
          joined_at: m.joined_at
        }))
        console.log('[team-detail] 从 team_members 查询到成员:', memberDetails.length)
      } else if (team.member_ids && team.member_ids.length > 0) {
        // 如果 team_members 表也没有，从 users 表查询
        console.log('[team-detail] team_members 表无数据，查询 users 表...')
        const usersResult = await db.collection('users')
          .where({
            openid: _.in(team.member_ids)
          })
          .get()

        memberDetails = usersResult.data.map(user => ({
          openid: user.openid,
          nickname: user.nickname || user.nick_name || '微信用户',
          role: team.leader_id === user.openid ? 'owner' : 'member',
          joined_at: team.created_at
        }))
        console.log('[team-detail] 从 users 查询到成员:', memberDetails.length)
      }
    }

    // 确定当前用户的角色
    const myMemberInfo = memberDetails.find(m => m.openid === OPENID)
    const myRole = myMemberInfo?.role || (team.leader_id === OPENID ? 'owner' : 'member')

    console.log('[team-detail] 返回团队详情, 成员数:', memberDetails.length)

    return {
      success: true,
      data: {
        team: {
          _id: team._id,
          name: team.name,
          description: team.description || '',
          leader_id: team.leader_id,
          leader_name: leaderName,
          members: team.member_ids || team.members || [],
          member_details: memberDetails,
          invite_code: team.invite_code || '',
          created_at: formatDate(team.created_at),
          my_role: myRole
        }
      }
    }

  } catch (err) {
    console.error('[team-detail] 获取团队详情失败:', err)
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
