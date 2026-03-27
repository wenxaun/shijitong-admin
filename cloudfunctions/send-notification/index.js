// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 发送通知云函数
 * 用于发送任务相关通知给用户
 */
exports.main = async (event, context) => {
  const { to_user_id, type, title, content, task_id } = event
  
  try {
    // 获取接收用户的 openid
    const db = cloud.database()
    
    // 查询用户信息
    const userResult = await db.collection('users').where({
      openid: to_user_id
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    // 存储通知记录
    await db.collection('notifications').add({
      data: {
        to_user_id,
        type,
        title,
        content,
        task_id,
        is_read: false,
        created_at: db.serverDate()
      }
    })
    
    // 这里可以扩展为订阅消息推送
    // 目前仅存储通知记录，后续可接入微信订阅消息
    
    return {
      success: true,
      message: '通知发送成功'
    }
  } catch (err) {
    console.error('发送通知失败:', err)
    return {
      success: false,
      message: '发送通知失败',
      error: err.message
    }
  }
}
