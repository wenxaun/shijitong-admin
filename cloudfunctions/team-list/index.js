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
  
  // 第一行就打印日志
  console.log('===== team-list 开始执行 =====')
  console.log('[team-list] 时间:', new Date().toISOString())
  console.log('[team-list] OPENID:', OPENID)
  console.log('[team-list] 参数:', JSON.stringify(event))
  
  try {
    // 方法1: 查询用户加入的团队（通过 team_members 表）
    console.log('[team-list] 查询 team_members 表...')
    const memberRes = await db.collection('team_members')
      .where({
        user_id: OPENID
      })
      .get()
    
    console.log('[team-list] 查询到的成员记录数:', memberRes.data.length)
    
    const teamIds = memberRes.data.map(m => m.team_id)
    console.log('[team-list] 团队ID列表:', teamIds)
    
    // 如果通过 team_members 表找到了团队
    if (teamIds.length > 0) {
      console.log('[team-list] 查询 teams 表...')
      const teamsRes = await db.collection('teams')
        .where({
          _id: _.in(teamIds)
        })
        .orderBy('created_at', 'desc')
        .get()
      
      console.log('[team-list] 查询到的团队数:', teamsRes.data.length)
      
      // 补充用户在各团队中的角色
      const teams = teamsRes.data.map(team => {
        const memberInfo = memberRes.data.find(m => m.team_id === team._id)
        return {
          _id: team._id,
          name: team.name,
          description: team.description || '',
          leader_id: team.leader_id,
          leader_name: team.leader_name || '',
          members: team.member_ids || [team.leader_id],
          member_details: team.member_details || [],
          invite_code: team.invite_code || '',
          created_at: team.created_at,
          my_role: memberInfo ? memberInfo.role : 'member'
        }
      })
      
      console.log('[team-list] 返回团队列表（方法1）, 数量:', teams.length)
      console.log('===== team-list 执行结束 =====')
      
      return {
        success: true,
        data: {
          teams: teams
        }
      }
    }
    
    // 方法2: 如果 team_members 表没有数据，尝试直接查询 teams 表（兼容旧数据）
    console.log('[team-list] team_members 表无数据，尝试查询 teams 表...')
    const teamsRes = await db.collection('teams')
      .where(_.or([
        { leader_id: OPENID },
        { member_ids: OPENID }
      ]))
      .orderBy('created_at', 'desc')
      .get()
    
    console.log('[team-list] 查询到的团队数:', teamsRes.data.length)
    
    const teams = teamsRes.data.map(team => {
      const isLeader = team.leader_id === OPENID
      const isMember = (team.member_ids || []).includes(OPENID)
      
      return {
        _id: team._id,
        name: team.name,
        description: team.description || '',
        leader_id: team.leader_id,
        leader_name: team.leader_name || '',
        members: team.member_ids || [team.leader_id],
        member_details: team.member_details || [],
        invite_code: team.invite_code || '',
        created_at: team.created_at,
        my_role: isLeader ? 'leader' : (isMember ? 'member' : 'member')
      }
    })
    
    console.log('[team-list] 返回团队列表（方法2）, 数量:', teams.length)
    console.log('===== team-list 执行结束 =====')
    
    return {
      success: true,
      data: {
        teams: teams
      }
    }
    
  } catch (err) {
    console.error('[team-list] 获取团队列表失败:', err)
    console.error('[team-list] 错误堆栈:', err.stack)
    return {
      success: false,
      message: '获取失败：' + err.message,
      errCode: err.errCode
    }
  }
}
