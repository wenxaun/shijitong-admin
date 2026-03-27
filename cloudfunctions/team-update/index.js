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
      target_openid,
      department,
      manager_id,
      manager_name,
      role,
      can_manage_team
    } = event
    
    if (!target_openid) {
      return {
        success: false,
        message: '目标用户 ID 为必填项'
      }
    }
    
    // 获取当前用户信息（验证权限）
    const currentUser = await db.collection('users').where({ openid: OPENID }).get()
    if (currentUser.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    const myRole = currentUser.data[0].role || 'executor'
    
    // 权限验证
    if (myRole !== 'admin' && myRole !== 'manager') {
      return {
        success: false,
        message: '无权限修改团队信息'
      }
    }
    
    // 获取目标用户信息
    const targetUser = await db.collection('users').where({ openid: target_openid }).get()
    if (targetUser.data.length === 0) {
      return {
        success: false,
        message: '目标用户不存在'
      }
    }
    
    const targetRole = targetUser.data[0].role || 'executor'
    
    // 权限限制：不能修改同级或上级
    if (myRole !== 'admin') {
      if (targetRole === 'admin' || targetRole === 'manager') {
        return {
          success: false,
          message: '无权限修改同级或上级'
        }
      }
      
      // 不能设置超过自己权限的角色
      if (role === 'admin' || role === 'manager') {
        return {
          success: false,
          message: '设置的权限不能超过自己的权限'
        }
      }
    }
    
    // 构建更新数据
    const updateData = {
      department: department || '',
      manager_id: manager_id || '',
      manager_name: manager_name || '',
      role: role || 'executor',
      can_manage_team: can_manage_team || false,
      updated_at: new Date()
    }
    
    // 更新用户信息
    await db.collection('users').where({ openid: target_openid }).update({
      data: updateData
    })
    
    return {
      success: true,
      message: '保存成功',
      data: updateData
    }
    
  } catch (err) {
    console.error('更新失败:', err)
    return {
      success: false,
      message: '更新失败：' + err.message,
      errCode: err.errCode
    }
  }
}
