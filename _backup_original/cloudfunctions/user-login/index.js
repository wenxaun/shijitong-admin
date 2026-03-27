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
    const { username, password, userInfo } = event
    
    // 微信登录模式
    if (userInfo && !username) {
      return await wechatLogin(userInfo, OPENID, APPID, db)
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

// 微信登录
async function wechatLogin(userInfo, OPENID, APPID, db) {
  const userRes = await db.collection('users').where({
    openid: OPENID
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
        openid: OPENID,
        appid: APPID,
        nickname: userInfo.nickName || '微信用户',
        avatar_url: userInfo.avatarUrl || '',
        role: 'executor',
        created_at: new Date(),
        last_login: new Date()
      }
    })
    user = {
      _id: result._id,
      openid: OPENID,
      nickname: userInfo.nickName || '微信用户',
      avatar_url: userInfo.avatarUrl || '',
      role: 'executor'
    }
  }
  
  return {
    success: true,
    message: isNewUser ? '欢迎加入事绩通！' : '欢迎回来！',
    data: {
      user_id: user._id,
      openid: OPENID,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      role: user.role,
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
