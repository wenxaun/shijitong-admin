// 云函数入口文件
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 密码加密
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID, APPID } = wxContext
  
  try {
    const { 
      username, 
      password, 
      phone, 
      nickname, 
      avatar_url,
      invite_code 
    } = event
    
    // 参数验证
    if (!username || !password) {
      return {
        success: false,
        message: '用户名和密码不能为空'
      }
    }
    
    if (username.length < 4 || username.length > 20) {
      return {
        success: false,
        message: '用户名长度 4-20 位'
      }
    }
    
    if (password.length < 6) {
      return {
        success: false,
        message: '密码长度至少 6 位'
      }
    }
    
    // 检查用户名是否已存在
    const existUser = await db.collection('users').where({
      username: username
    }).get()
    
    if (existUser.data.length > 0) {
      return {
        success: false,
        message: '用户名已存在'
      }
    }
    
    // 检查手机号是否已存在（如果提供）
    if (phone) {
      const existPhone = await db.collection('users').where({
        phone: phone
      }).get()
      
      if (existPhone.data.length > 0) {
        return {
          success: false,
          message: '手机号已被注册'
        }
      }
    }
    
    // 检查用户名是否已绑定该 OPENID
    const existUserByOpenid = await db.collection('users').where({
      openid: OPENID,
      username: username
    }).get()
    
    if (existUserByOpenid.data.length > 0) {
      return {
        success: false,
        message: '该用户名已注册'
      }
    }
    
    // 创建用户
    const result = await db.collection('users').add({
      data: {
        openid: OPENID,
        appid: APPID,
        username: username,
        password_hash: hashPassword(password),
        phone: phone || '',
        nickname: nickname || username,
        avatar_url: avatar_url || '',
        
        // 组织信息（初始为空）
        organization_id: '',
        organization_name: '',
        department_id: '',
        department_path: '',
        department_level: 0,
        
        // 职位信息
        position: '',
        employee_id: '',
        manager_id: '',
        manager_name: '',
        
        // 权限信息
        role: 'executor',
        permissions: [],
        can_manage_team: true,  // 个人用户默认可以创建团队
        can_create_task: true,
        can_view_all: false,
        
        // 状态
        status: 'active',
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    })
    
    // 注册成功后自动登录
    return {
      success: true,
      message: '注册成功！',
      data: {
        user_id: result._id,
        openid: OPENID,
        username: username,
        nickname: nickname || username,
        avatar_url: avatar_url || '',
        role: 'executor',
        isNewUser: true
      }
    }
    
  } catch (err) {
    console.error('用户注册失败:', err)
    return {
      success: false,
      message: '注册失败：' + err.message,
      errCode: err.errCode
    }
  }
}
