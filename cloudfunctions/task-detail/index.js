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
  const { task_id } = event

  try {
    if (!task_id) {
      return {
        success: false,
        message: '任务ID不能为空'
      }
    }

    // 查询任务详情
    const taskResult = await db.collection('tasks').doc(task_id).get()
    
    if (!taskResult.data) {
      return {
        success: false,
        message: '任务不存在'
      }
    }

    const task = taskResult.data

    // 获取发布人名称
    let publisherName = '未知'
    if (task.publisher_id) {
      const publisherResult = await db.collection('users')
        .where({ openid: task.publisher_id })
        .limit(1)
        .get()
      if (publisherResult.data.length > 0) {
        publisherName = publisherResult.data[0].nick_name || '微信用户'
      }
    }

    // 获取执行人名称
    let executorName = '未知'
    if (task.executor_id) {
      const executorResult = await db.collection('users')
        .where({ openid: task.executor_id })
        .limit(1)
        .get()
      if (executorResult.data.length > 0) {
        executorName = executorResult.data[0].nick_name || '微信用户'
      }
    }

    return {
      success: true,
      data: {
        task: {
          _id: task._id,
          task_id: task._id,
          task_name: task.task_name,
          task_description: task.task_description || '',
          status: task.status,
          priority: task.priority || 'P2',
          category: task.category || '',
          publisher_id: task.publisher_id,
          executor_id: task.executor_id,
          require_date: formatDate(task.require_date),
          complete_date: task.complete_date ? formatDate(task.complete_date) : null,
          score: task.score,
          score_note: task.score_note || '',
          learnings: task.learnings || '',
          delay_reason: task.delay_reason || '',
          improvements: task.improvements || '',
          attribution_tags: task.attribution_tags || [],
          exception_type: task.exception_type,
          exception_reason: task.exception_reason,
          new_deadline: task.new_deadline,
          has_exception: task.has_exception || false,
          created_at: formatDate(task.created_at),
          updated_at: formatDate(task.updated_at)
        },
        publisher_name: publisherName,
        executor_name: executorName
      }
    }

  } catch (err) {
    console.error('获取任务详情失败:', err)
    return {
      success: false,
      message: '获取任务详情失败：' + err.message,
      errCode: err.errCode
    }
  }
}

// 日期格式化辅助函数
function formatDate(date) {
  if (!date) return null
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
