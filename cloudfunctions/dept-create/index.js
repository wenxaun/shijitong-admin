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
      organization_id,
      name,
      short_name,
      parent_id,
      manager_id,
      order = 0
    } = event
    
    // 参数验证
    if (!name || name.length < 2) {
      return {
        success: false,
        message: '部门名称至少 2 个字'
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
    
    // 权限检查
    if (!['creator', 'admin', 'manager'].includes(user.role)) {
      return {
        success: false,
        message: '无权限创建部门'
      }
    }
    
    // 计算部门层级和路径
    let level = 1
    let parent_path = ''
    
    if (parent_id) {
      const parentDept = await db.collection('departments').doc(parent_id).get()
      if (parentDept.data) {
        level = (parentDept.data.level || 0) + 1
        parent_path = parentDept.data.parent_path ? 
          `${parentDept.data.parent_path}/${parentDept.data.name}` : 
          parentDept.data.name
        
        if (level > 3) {
          return {
            success: false,
            message: '最多支持 3 级部门'
          }
        }
      }
    }
    
    // 创建部门
    const result = await db.collection('departments').add({
      data: {
        organization_id: organization_id,
        name: name,
        short_name: short_name || name,
        parent_id: parent_id || '',
        parent_path: parent_path,
        level: level,
        order: order,
        
        // 负责人
        manager_id: manager_id || '',
        manager_name: '',
        
        // 统计
        member_count: 0,
        
        // 状态
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    // 更新组织的部门数量
    await db.collection('organizations').doc(organization_id).update({
      data: {
        department_count: db.command.inc(1),
        updated_at: new Date()
      }
    })
    
    return {
      success: true,
      message: '部门创建成功！',
      data: {
        department_id: result._id,
        name: name,
        level: level
      }
    }
    
  } catch (err) {
    console.error('创建部门失败:', err)
    return {
      success: false,
      message: '创建失败：' + err.message,
      errCode: err.errCode
    }
  }
}
