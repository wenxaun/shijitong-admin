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
  let openid = OPENID
  let userType = 'personal'
  let wecomUserid = null
  let wecomCorpid = null
  
  if (isWework) {
    const wxContext = cloud.getWXContext()
    userType = 'enterprise'
    wecomCorpid = wxContext.CORP_ID || userInfo.corpId
    wecomUserid = userInfo.userid // 企业微信用户唯一标识
    
    console.log('[企业微信登录] CORP_ID:', wecomCorpid, 'userid:', wecomUserid, 'OPENID:', OPENID)
  }
  
  // 去重查询逻辑
  let userRes
  
  if (isWework && wecomUserid) {
    // 企业微信：优先用 wecom_userid 查询（企业内唯一）
    userRes = await db.collection('users').where({
      wecom_userid: wecomUserid
    }).get()
    console.log('[企业微信] 按 wecom_userid 查询:', userRes.data.length, '条')
    
    // 如果没找到，再按 openid 查询
    if (userRes.data.length === 0) {
      userRes = await db.collection('users').where({
        openid: openid,
        user_type: 'enterprise'
      }).get()
      console.log('[企业微信] 按 openid 查询:', userRes.data.length, '条')
    }
  } else {
    // 普通微信：按 openid 查询
    userRes = await db.collection('users').where({
      openid: openid
    }).get()
  }
  
  let user
  let isNewUser = false
  
  if (userRes.data.length > 0) {
    // 已存在用户，更新信息
    user = userRes.data[0]
    
    const updateData = {
      nickname: userInfo.nickName || user.nickname,
      avatar_url: userInfo.avatarUrl || user.avatar_url,
      last_login: new Date()
    }
    
    // 企业微信用户更新 wecom_userid（可能之前没有）
    if (isWework && wecomUserid && !user.wecom_userid) {
      updateData.wecom_userid = wecomUserid
      updateData.wecom_corpid = wecomCorpid
    }
    
    await db.collection('users').doc(user._id).update({
      data: updateData
    })
    console.log('[登录] 更新用户信息:', user._id)
  } else {
    // 新用户
    isNewUser = true
    
    const newUserData = {
      openid: openid,
      appid: APPID,
      user_type: userType,
      nickname: userInfo.nickName || (isWework ? '企业用户' : '微信用户'),
      avatar_url: userInfo.avatarUrl || '',
      role: 'member', // 所有新用户默认为普通成员
      created_at: new Date(),
      last_login: new Date()
    }
    
    if (isWework) {
      Object.assign(newUserData, {
        is_wework_user: true,
        wecom_userid: wecomUserid,
        wecom_corpid: wecomCorpid
      })
    }
    
    const result = await db.collection('users').add({
      data: newUserData
    })
    
    user = {
      _id: result._id,
      openid: openid,
      user_type: userType,
      nickname: newUserData.nickname,
      avatar_url: newUserData.avatar_url,
      role: 'member',
      is_wework_user: isWework
    }
    
    console.log('[登录] 创建新用户:', result._id, '类型:', userType)
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
