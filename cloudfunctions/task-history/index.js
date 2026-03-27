// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  const {
    type = 'created', // created: 我创建的, executed: 我执行的, deleted: 已删除
    page = 1,
    pageSize = 20
  } = event

  try {
    let query = {}
    
    if (type === 'created') {
      // 我创建的任务
      query = {
        publisher_id: OPENID,
        status: _.in(['completed', 'cancelled'])
      }
    } else if (type === 'executed') {
      // 我执行的任务
      query = {
        executor_id: OPENID,
        status: _.in(['completed', 'cancelled'])
      }
    } else if (type === 'deleted') {
      // 已删除的任务（如果有软删除字段）
      query = {
        _openid: OPENID,
        is_deleted: true
      }
    }

    // 查询数据库
    const result = await db.collection('tasks')
      .where(query)
      .orderBy('updated_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 获取总数
    const countResult = await db.collection('tasks').where(query).count()

    // 格式化返回数据
    const tasks = result.data.map(task => ({
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
      created_at: formatDate(task.created_at),
      updated_at: formatDate(task.updated_at)
    }))

    return {
      success: true,
      data: {
        tasks,
        total: countResult.total,
        page,
        pageSize,
        hasMore: (page * pageSize) < countResult.total
      }
    }

  } catch (err) {
    console.error('获取历史任务失败:', err)
    return {
      success: false,
      message: '获取历史任务失败：' + err.message,
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
