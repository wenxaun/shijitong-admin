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
    const { organization_id, parent_id } = event
    
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
    
    // 权限检查
    if (!user.organization_id || user.organization_id !== organization_id) {
      return {
        success: false,
        message: '无权访问该组织'
      }
    }
    
    if (!['creator', 'admin', 'manager'].includes(user.role)) {
      return {
        success: false,
        message: '无权限查看部门列表'
      }
    }
    
    // 查询部门列表
    let query = { organization_id, status: 'active' }
    if (parent_id !== undefined) {
      query.parent_id = parent_id || ''
    }
    
    const deptsRes = await db.collection('departments')
      .where(query)
      .orderBy('order', 'asc')
      .get()
    
    return {
      success: true,
      data: {
        departments: deptsRes.data
      }
    }
    
  } catch (err) {
    console.error('获取部门列表失败:', err)
    return {
      success: false,
      message: '获取失败：' + err.message,
      errCode: err.errCode
    }
  }
}
