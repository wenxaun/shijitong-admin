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
  
  console.log('===== user-update 开始执行 =====')
  console.log('[user-update] OPENID:', OPENID)
  console.log('[user-update] 参数:', JSON.stringify(event))
  
  try {
    const { nickname, avatar_url } = event
    
    // 至少需要提供一个更新字段
    if (!nickname && !avatar_url) {
      return {
        success: false,
        message: '请提供要更新的信息'
      }
    }
    
    // 查询用户
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    const user = userRes.data[0]
    
    // 构建更新数据
    const updateData = {
      updated_at: new Date()
    }
    
    if (nickname) {
      updateData.nickname = nickname
      // 兼容旧字段
      updateData.nick_name = nickname
    }
    
    if (avatar_url) {
      updateData.avatar_url = avatar_url
    }
    
    // 更新用户信息
    await db.collection('users').doc(user._id).update({
      data: updateData
    })
    
    console.log('[user-update] 更新成功')
    console.log('===== user-update 执行结束 =====')
    
    return {
      success: true,
      message: '更新成功',
      data: {
        nickname: updateData.nickname || user.nickname,
        avatar_url: updateData.avatar_url || user.avatar_url
      }
    }
    
  } catch (err) {
    console.error('[user-update] 更新失败:', err)
    return {
      success: false,
      message: '更新失败：' + err.message
    }
  }
}
