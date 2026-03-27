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
    const { organization_id } = event
    
    // 获取用户信息
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户未登录'
      }
    }
    
    const user = userRes.data[0]
    
    // 查询用户加入的团队
    const memberRes = await db.collection('team_members')
      .where({
        user_id: OPENID,
        status: 'active'
      })
      .get()
    
    const teamIds = memberRes.data.map(m => m.team_id)
    
    // 查询团队列表
    let query = { status: 'active' }
    
    if (organization_id) {
      query.organization_id = organization_id
    }
    
    // 如果是公开团队或用户加入的团队
    if (teamIds.length > 0) {
      query = db.command.or([
        { _id: db.command.in(teamIds) },
        { visibility: 'public' }
      ])
      
      if (organization_id) {
        query = db.command.and([
          query,
          { organization_id }
        ])
      }
    }
    
    const teamsRes = await db.collection('teams')
      .where(query)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()
    
    // 补充用户在各团队中的角色
    const teams = teamsRes.data.map(team => {
      const memberInfo = memberRes.data.find(m => m.team_id === team._id)
      return {
        ...team,
        my_role: memberInfo ? memberInfo.role : null,
        is_member: !!memberInfo
      }
    })
    
    return {
      success: true,
      data: {
        teams: teams,
        user_role: user.role
      }
    }
    
  } catch (err) {
    console.error('获取团队列表失败:', err)
    return {
      success: false,
      message: '获取失败：' + err.message,
      errCode: err.errCode
    }
  }
}
