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
  
  try {
    const {
      status,        // 筛选状态：pending, in_progress, completed, cancelled
      priority,      // 筛选优先级：P0, P1, P2, P3
      time_filter,   // 时间筛选：all, today, week, month
      role = 'executor', // 角色：executor(我执行的) / publisher(我发布的)
      page = 1,
      pageSize = 20
    } = event
    
    // 构建查询条件
    let query = {}
    
    // 按角色筛选
    if (role === 'executor') {
      query.executor_id = OPENID
    } else if (role === 'publisher') {
      query.publisher_id = OPENID
    }
    
    // 按状态筛选
    if (status) {
      query.status = status
    }
    
    // 按优先级筛选
    if (priority) {
      query.priority = priority
    }
    
    // 按时间筛选
    const now = new Date()
    if (time_filter === 'today') {
      // 今日：require_date = today
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      query.require_date = today
    } else if (time_filter === 'week') {
      // 本周：require_date >= 本周一
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const monday = new Date(today)
      monday.setDate(monday.getDate() - monday.getDay() + 1)
      query.require_date = { $gte: monday }
    } else if (time_filter === 'month') {
      // 本月：require_date >= 本月 1 号
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      query.require_date = { $gte: firstDay }
    }
    
    // 查询数据库
    const result = await db.collection('tasks')
      .where(query)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const countResult = await db.collection('tasks').where(query).count()
    
    // 格式化返回数据
    const tasks = result.data.map(task => ({
      task_id: task._id,
      task_name: task.task_name,
      task_description: task.task_description,
      status: task.status,
      priority: task.priority,
      category: task.category,
      publisher_id: task.publisher_id,
      executor_id: task.executor_id,
      require_date: formatDate(task.require_date),
      complete_date: task.complete_date ? formatDate(task.complete_date) : null,
      score: task.score,
      score_note: task.score_note,
      learnings: task.learnings || '',
      delay_reason: task.delay_reason || '',
      improvements: task.improvements || '',
      attribution_tags: task.attribution_tags || [],
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
    console.error('获取任务列表失败:', err)
    return {
      success: false,
      message: '获取任务列表失败：' + err.message,
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
