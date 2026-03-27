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
  
  console.log('[team-list] 开始查询团队列表, OPENID:', OPENID)
  
  try {
    // 查询用户加入的团队（通过 team_members 表）
    const memberRes = await db.collection('team_members')
      .where({
        user_id: OPENID,
        status: 'active'
      })
      .get()
    
    console.log('[team-list] 查询到的成员记录数:', memberRes.data.length)
    console.log('[team-list] 成员记录:', JSON.stringify(memberRes.data))
    
    const teamIds = memberRes.data.map(m => m.team_id)
    console.log('[team-list] 团队ID列表:', teamIds)
    
    // 如果没有加入任何团队，返回空列表
    if (teamIds.length === 0) {
      console.log('[team-list] 用户未加入任何团队')
      return {
        success: true,
        data: {
          teams: [],
          user_role: 'executor'
        }
      }
    }
    
    // 查询团队详情
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
        ...team,
        my_role: memberInfo ? memberInfo.role : 'member',
        is_member: true
      }
    })
    
    console.log('[team-list] 返回团队列表, 数量:', teams.length)
    
    return {
      success: true,
      data: {
        teams: teams,
        user_role: 'executor'
      }
    }
    
  } catch (err) {
    console.error('[team-list] 获取团队列表失败:', err)
    return {
      success: false,
      message: '获取失败：' + err.message,
      errCode: err.errCode
    }
  }
}
