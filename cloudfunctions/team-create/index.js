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
  
  console.log('[team-create] 开始创建团队, OPENID:', OPENID)
  
  try {
    const {
      organization_id,
      name,
      description,
      type = 'project',
      category = '',
      visibility = 'internal',
      join_mode = 'invite_only'
    } = event
    
    // 参数验证
    if (!name || name.length < 2) {
      return {
        success: false,
        message: '团队名称至少 2 个字'
      }
    }
    
    // 检查团队名是否已存在
    const existTeam = await db.collection('teams').where({
      name: name
    }).get()
    
    if (existTeam.data.length > 0) {
      return {
        success: false,
        message: '团队名称已存在，请换一个名称'
      }
    }
    
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
    console.log('[team-create] 用户信息:', user.nickname)
    
    // 创建团队
    const result = await db.collection('teams').add({
      data: {
        organization_id: organization_id || null,
        name: name,
        description: description || '',
        type: type,
        category: category,
        
        // 负责人
        leader_id: OPENID,
        leader_name: user.nickname || '微信用户',
        
        // 成员
        member_ids: [OPENID],
        member_count: 1,
        
        // 权限设置
        visibility: visibility,
        join_mode: join_mode,
        can_create_task: [OPENID],
        can_view_task: [OPENID],
        
        // 统计
        task_count: 0,
        completed_count: 0,
        
        // 状态
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    console.log('[team-create] 团队创建成功, team_id:', result._id)
    
    // 更新组织的团队数量（如果有组织）
    if (organization_id) {
      try {
        await db.collection('organizations').doc(organization_id).update({
          data: {
            team_count: db.command.inc(1),
            updated_at: new Date()
          }
        })
      } catch (err) {
        console.log('[team-create] 更新组织统计失败，跳过:', err.message)
      }
    }
    
    // 创建团队成员关系
    const memberResult = await db.collection('team_members').add({
      data: {
        team_id: result._id,
        user_id: OPENID,
        user_name: user.nickname || '微信用户',
        role: 'leader',
        title: '创始人',
        joined_at: new Date(),
        joined_by: OPENID,
        status: 'active'
      }
    })
    
    console.log('[team-create] 团队成员关系创建成功, member_id:', memberResult._id)
    
    return {
      success: true,
      message: '团队创建成功！',
      data: {
        team_id: result._id,
        name: name,
        leader_role: 'leader'
      }
    }
    
  } catch (err) {
    console.error('[team-create] 创建团队失败:', err)
    return {
      success: false,
      message: '创建失败：' + err.message,
      errCode: err.errCode
    }
  }
}
