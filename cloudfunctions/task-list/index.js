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
  
  console.log('[task-list] 开始查询任务列表, OPENID:', OPENID)
  console.log('[task-list] 查询参数:', event)
  
  try {
    const {
      status,        // 筛选状态：pending, in_progress, completed, cancelled
      priority,      // 筛选优先级：P0, P1, P2, P3
      time_filter,   // 时间筛选：all, today, week, month
      page = 1,
      pageSize = 20
    } = event
    
    // 构建查询条件 - 同时查询我是执行人和我是发布人的任务
    let baseQuery = _.or([
      { executor_id: OPENID },
      { publisher_id: OPENID }
    ])
    
    // 按状态筛选
    if (status) {
      baseQuery = _.and([
        baseQuery,
        { status: status }
      ])
    }
    
    // 按优先级筛选
    if (priority) {
      baseQuery = _.and([
        baseQuery,
        { priority: priority }
      ])
    }
    
    // 按时间筛选
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    if (time_filter === 'today') {
      baseQuery = _.and([
        baseQuery,
        { require_date: todayStr }
      ])
    } else if (time_filter === 'week') {
      const monday = new Date(today)
      monday.setDate(monday.getDate() - today.getDay() + 1)
      const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      baseQuery = _.and([
        baseQuery,
        { require_date: _.gte(mondayStr) }
      ])
    } else if (time_filter === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const firstDayStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
      baseQuery = _.and([
        baseQuery,
        { require_date: _.gte(firstDayStr) }
      ])
    }
    
    console.log('[task-list] 查询条件:', JSON.stringify(baseQuery))
    
    // 查询数据库
    const result = await db.collection('tasks')
      .where(baseQuery)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    console.log('[task-list] 查询到的任务数:', result.data.length)
    
    // 获取总数
    const countResult = await db.collection('tasks').where(baseQuery).count()
    
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
      executor_name: task.executor_name,
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
    
    console.log('[task-list] 返回任务列表, 数量:', tasks.length, '总数:', countResult.total)
    
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
    console.error('[task-list] 获取任务列表失败:', err)
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
