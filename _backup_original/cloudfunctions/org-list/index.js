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
    const orgId = user.organization_id
    
    // 如果用户已加入组织，返回该组织
    if (orgId) {
      const orgRes = await db.collection('organizations').doc(orgId).get()
      
      if (orgRes.data) {
        return {
          success: true,
          data: {
            organization: orgRes.data,
            user_role: user.role
          }
        }
      }
    }
    
    // 如果用户没有组织，返回可加入的组织列表（公开组织）
    const orgsRes = await db.collection('organizations')
      .where({ status: 'active' })
      .limit(10)
      .get()
    
    return {
      success: true,
      data: {
        organization: null,
        public_orgs: orgsRes.data,
        user_role: user.role
      },
      message: user.organization_id ? '' : '您还未加入任何组织'
    }
    
  } catch (err) {
    console.error('获取组织失败:', err)
    return {
      success: false,
      message: '获取失败：' + err.message,
      errCode: err.errCode
    }
  }
}
