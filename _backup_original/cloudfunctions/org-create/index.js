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
    const { 
      name, 
      short_name, 
      description, 
      logo_url 
    } = event
    
    // 参数验证
    if (!name || name.length < 2) {
      return {
        success: false,
        message: '组织名称至少 2 个字'
      }
    }
    
    // 获取创建者信息
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
    
    // 检查是否已创建过组织（一人只能创建一个）
    const existOrg = await db.collection('organizations').where({
      creator_id: OPENID
    }).get()
    
    if (existOrg.data.length > 0) {
      return {
        success: false,
        message: '您已创建过组织，一个用户只能创建一个组织'
      }
    }
    
    // 创建组织
    const result = await db.collection('organizations').add({
      data: {
        name: name,
        short_name: short_name || name,
        logo_url: logo_url || '',
        description: description || '',
        
        // 管理员
        creator_id: OPENID,
        creator_name: user.nickname || '微信用户',
        admin_ids: [OPENID],
        
        // 统计
        member_count: 1,
        department_count: 0,
        team_count: 0,
        
        // 状态
        status: 'active',
        max_members: 1000,
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    // 更新创建者的组织信息
    await db.collection('users').doc(user._id).update({
      data: {
        organization_id: result._id,
        organization_name: name,
        role: 'creator',
        can_manage_team: true,
        can_create_task: true,
        can_view_all: true,
        updated_at: new Date()
      }
    })
    
    return {
      success: true,
      message: '组织创建成功！',
      data: {
        organization_id: result._id,
        name: name,
        creator_role: 'creator'
      }
    }
    
  } catch (err) {
    console.error('创建组织失败:', err)
    return {
      success: false,
      message: '创建失败：' + err.message,
      errCode: err.errCode
    }
  }
}
