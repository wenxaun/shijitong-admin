// cloudfunctions/comment-add/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { task_id, content, parent_id } = event

  // 验证必填字段
  if (!task_id || !content) {
    return {
      success: false,
      message: '任务 ID 和评论内容不能为空'
    }
  }

  try {
    // 检查任务是否存在
    const task = await db.collection('tasks').doc(task_id).get()
    if (!task.data) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    // 获取当前用户信息
    const user = await db.collection('users').where({
      openid: wxContext.OPENID
    }).field({
      openid: true,
      nickname: true,
      avatar_url: true
    }).get()

    const userInfo = user.data.length > 0 ? user.data[0] : {
      openid: wxContext.OPENID,
      nickname: '微信用户',
      avatar_url: ''
    }

    // 生成评论 ID
    const comment_id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 添加到 comments 数组
    const newComment = {
      id: comment_id,
      user_id: wxContext.OPENID,
      user_name: userInfo.nickname,
      avatar_url: userInfo.avatar_url,
      content: content.trim(),
      created_at: Date.now(),
      parent_id: parent_id || null,
      reply_to: parent_id ? '回复' : null
    }

    await db.collection('tasks').doc(task_id).update({
      data: {
        comments: _.push(newComment),
        updated_at: Date.now()
      }
    })

    return {
      success: true,
      message: '评论成功',
      comment: newComment
    }

  } catch (err) {
    console.error('添加评论失败:', err)
    return {
      success: false,
      message: '评论失败：' + err.message,
      error: err
    }
  }
}
