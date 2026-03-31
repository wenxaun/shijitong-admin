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
  
  // 第一行就打印日志
  console.log('===== task-list 开始执行 =====')
  console.log('[task-list] 时间:', new Date().toISOString())
  console.log('[task-list] OPENID:', OPENID)
  console.log('[task-list] 参数:', JSON.stringify(event))
  
  try {
    const {
      status,
      priority,
      time_filter,
      page = 1,
      pageSize = 20
    } = event
    
    // 构建查询条件数组
    const conditions = []
    
    // 查询我是执行人或发布人的任务
    conditions.push(_.or([
      { executor_id: OPENID },
      { publisher_id: OPENID }
    ]))
    
    // 按状态筛选
    if (status) {
      conditions.push({ status: status })
    }
    
    // 按优先级筛选
    if (priority) {
      conditions.push({ priority: priority })
    }
    
    // 按时间筛选
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    // 支持自定义日期范围（按创建日期筛选）
    const { start_date, end_date } = event
    
    if (start_date && end_date) {
      // 自定义日期范围筛选（按创建日期）
      const startDateTime = new Date(start_date + ' 00:00:00')
      const endDateTime = new Date(end_date + ' 23:59:59')
      conditions.push({ created_at: _.and(_.gte(startDateTime), _.lte(endDateTime)) })
    } else if (time_filter === 'today') {
      // 今日创建的任务
      const todayStart = new Date(todayStr + ' 00:00:00')
      const todayEnd = new Date(todayStr + ' 23:59:59')
      conditions.push({ created_at: _.and(_.gte(todayStart), _.lte(todayEnd)) })
    } else if (time_filter === 'week') {
      // 本周创建的任务
      const monday = new Date(today)
      monday.setDate(monday.getDate() - today.getDay() + 1)
      const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      const mondayStart = new Date(mondayStr + ' 00:00:00')
      conditions.push({ created_at: _.gte(mondayStart) })
    } else if (time_filter === 'month') {
      // 本月创建的任务
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const firstDayStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
      const firstDayStart = new Date(firstDayStr + ' 00:00:00')
      conditions.push({ created_at: _.gte(firstDayStart) })
    }
    
    // 构建最终查询条件
    const query = conditions.length > 1 ? _.and(conditions) : conditions[0]
    
    console.log('[task-list] 查询条件:', JSON.stringify(query, null, 2))
    
    // 查询数据库
    const result = await db.collection('tasks')
      .where(query)
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    console.log('[task-list] 查询到的任务数:', result.data.length)
    
    // 获取总数
    const countResult = await db.collection('tasks').where(query).count()
    
    // 格式化返回数据
    const tasks = result.data.map(task => ({
      _id: task._id,
      task_id: task._id,
      task_name: task.task_name,
      task_description: task.task_description || '',
      status: task.status,
      priority: task.priority,
      category: task.category || '',
      group_id: task.group_id || '',
      group_name: task.group_name || '',
      publisher_id: task.publisher_id,
      executor_id: task.executor_id,
      executor_name: task.executor_name || '',
      require_date: formatDate(task.require_date),
      complete_date: task.complete_date ? formatDate(task.complete_date) : null,
      score: task.score,
      score_note: task.score_note || '',
      learnings: task.learnings || '',
      delay_reason: task.delay_reason || '',
      improvements: task.improvements || '',
      attribution_tags: task.attribution_tags || [],
      created_at: formatDate(task.created_at),
      updated_at: formatDate(task.updated_at)
    }))
    
    console.log('[task-list] 返回任务列表, 数量:', tasks.length, '总数:', countResult.total)
    console.log('===== task-list 执行结束 =====')
    
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
    console.error('[task-list] 错误堆栈:', err.stack)
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
