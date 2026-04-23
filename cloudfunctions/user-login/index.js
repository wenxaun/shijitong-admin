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
    const { username, password, userInfo, environment } = event
    
    // 企业微信登录模式
    if (environment === 'wework') {
      return await wechatLogin(userInfo, OPENID, APPID, db, true)
    }
    
    // 微信登录模式
    if (userInfo && !username) {
      return await wechatLogin(userInfo, OPENID, APPID, db, false)
    }
    
    // 用户名密码登录模式
    if (username && password) {
      return await passwordLogin(username, password, OPENID, APPID, db, hashPassword)
    }
    
    return {
      success: false,
      message: '请提供用户名密码或微信授权信息'
    }
    
  } catch (err) {
    console.error('用户登录失败:', err)
    return {
      success: false,
      message: '登录失败：' + err.message,
      errCode: err.errCode
    }
  }
}

// 微信登录（支持企业微信）
async function wechatLogin(userInfo, OPENID, APPID, db, isWework = false) {
  // 企业微信用户使用特殊的 openid 格式
  let openid = OPENID
  let userType = 'personal'
  
  if (isWework) {
    // 企业微信用户：尝试从 wxContext 获取企业信息
    const wxContext = cloud.getWXContext()
    userType = 'enterprise'
    
    // 如果有企业微信特有的标识，使用企业用户的唯一标识
    if (wxContext && wxContext.CORP_ID) {
      openid = `wework_${OPENID}_${wxContext.CORP_ID}`
    }
  }
  
  const userRes = await db.collection('users').where({
    openid: openid
  }).get()
  
  let user
  let isNewUser = false
  
  if (userRes.data.length > 0) {
    user = userRes.data[0]
    await db.collection('users').doc(user._id).update({
      data: {
        nickname: userInfo.nickName || user.nickname,
        avatar_url: userInfo.avatarUrl || user.avatar_url,
        last_login: new Date()
      }
    })
  } else {
    isNewUser = true
    const result = await db.collection('users').add({
      data: {
        openid: openid,
        appid: APPID,
        user_type: userType,             // 添加用户类型
        nickname: userInfo.nickName || (isWework ? '企业用户' : '微信用户'),
        avatar_url: userInfo.avatarUrl || '',
        role: 'executor',
        ...(isWework && {
          is_wework_user: true,
          // 企业微信特有字段（如果有企业API可以获取更多信息）
          wecom_userid: userInfo.userid || null,
          wecom_corpid: userInfo.corpId || null
        }),
        created_at: new Date(),
        last_login: new Date()
      }
    })
    user = {
      _id: result._id,
      openid: openid,
      user_type: userType,
      nickname: userInfo.nickName || (isWework ? '企业用户' : '微信用户'),
      avatar_url: userInfo.avatarUrl || '',
      role: 'executor',
      is_wework_user: isWework
    }
  }
  
  return {
    success: true,
    message: isNewUser ? '欢迎加入事绩通！' : '欢迎回来！',
    data: {
      user_id: user._id,
      openid: openid,
      user_type: user.user_type,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      role: user.role,
      is_wework_user: user.is_wework_user || false,
      isNewUser
    }
  }
}

// 用户名密码登录
async function passwordLogin(username, password, OPENID, APPID, db, hashPassword) {
  const passwordHash = hashPassword(password)
  
  // 查询用户
  const userRes = await db.collection('users').where({
    username: username,
    password_hash: passwordHash
  }).get()
  
  if (userRes.data.length === 0) {
    return {
      success: false,
      message: '用户名或密码错误'
    }
  }
  
  const user = userRes.data[0]
  
  // 更新登录信息
  await db.collection('users').doc(user._id).update({
    data: {
      last_login: new Date(),
      openid: OPENID // 绑定当前微信 OPENID
    }
  })
  
  return {
    success: true,
    message: '登录成功！',
    data: {
      user_id: user._id,
      openid: OPENID,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      role: user.role,
      username: user.username,
      isNewUser: false
    }
  }
}
