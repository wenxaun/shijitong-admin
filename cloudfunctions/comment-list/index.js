// cloudfunctions/comment-list/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { task_id, limit = 50 } = event

  // 验证必填字段
  if (!task_id) {
    return {
      success: false,
      message: '任务 ID 不能为空'
    }
  }

  try {
    // 获取任务
    const task = await db.collection('tasks').doc(task_id).get()
    if (!task.data) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    const comments = task.data.comments || []
    
    // 按时间倒序排序
    comments.sort((a, b) => b.created_at - a.created_at)

    // 限制返回数量
    const limitedComments = comments.slice(0, limit)

    return {
      success: true,
      comments: limitedComments,
      total: comments.length
    }

  } catch (err) {
    console.error('获取评论列表失败:', err)
    return {
      success: false,
      message: '获取失败：' + err.message,
      error: err
    }
  }
}
