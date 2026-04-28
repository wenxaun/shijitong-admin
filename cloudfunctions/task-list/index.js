// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 获取时间范围的辅助函数（统一按截止日期筛选）
function getTimeRange(timeFilter) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  if (timeFilter === 'today') {
    // 今日：今天 00:00:00 到 23:59:59
    const start = today
    const end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
    return { start, end }
  } else if (timeFilter === 'week') {
    // 本周：周一 00:00:00 到周日 23:59:59
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    monday.setHours(0, 0, 0, 0)
    return { start: monday, end: sunday }
  } else if (timeFilter === 'month') {
    // 本月：1号 00:00:00 到月末 23:59:59
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start: firstDay, end: lastDay }
  }
  return null
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  console.log('===== task-list 开始执行 =====')
  console.log('[task-list] 时间:', new Date().toISOString())
  console.log('[task-list] OPENID:', OPENID)
  console.log('[task-list] 参数:', JSON.stringify(event))
  
  try {
    const {
      status,
      priority,
      time_filter,
      start_date,
      end_date,
      page = 1,
      pageSize = 20,
      view_type, // 新增：视图类型（all/assigned/followed）
      user_type // 新增：用户类型（personal/enterprise）
    } = event
    
    // 构建查询条件数组
    const conditions = []
    
    // 根据用户类型过滤（用户隔离）
    if (user_type) {
      conditions.push({ user_type: user_type })
    }
    
    // 根据视图类型筛选
    if (view_type === 'assigned') {
      // 我分配的任务（我是发布人）
      conditions.push({ publisher_id: OPENID })
    } else if (view_type === 'followed') {
      // 我关注的任务（查询 task_follows 表）
      const followsResult = await db.collection('task_follows')
        .where({ user_id: OPENID })
        .field({ task_id: true })
        .limit(100)
        .get()
      
      const followedTaskIds = followsResult.data.map(f => f.task_id)
      if (followedTaskIds.length === 0) {
        // 没有关注的任务，返回空列表
        return {
          success: true,
          data: {
            tasks: [],
            total: 0,
            page,
            pageSize,
            hasMore: false
          }
        }
      }
      conditions.push({ _id: _.in(followedTaskIds) })
    } else {
      // 默认：查询我是执行人或发布人的任务
      conditions.push(_.or([
        { executor_id: OPENID },
        { publisher_id: OPENID }
      ]))
    }
    
    // 按状态筛选
    if (status && status !== 'all') {
      conditions.push({ status: status })
    }
    
    // 按优先级筛选
    if (priority) {
      conditions.push({ priority: priority })
    }
    
    // 时间筛选：统一按截止日期（require_date）筛选
    // require_date 存储格式为 'YYYY-MM-DD' 字符串
    if (start_date && end_date) {
      // 自定义日期范围筛选：使用字符串比较
      conditions.push({ require_date: _.and(_.gte(start_date), _.lte(end_date)) })
    } else if (time_filter) {
      const timeRange = getTimeRange(time_filter)
      if (timeRange) {
        // 将时间范围转为 'YYYY-MM-DD' 格式字符串
        const startDateStr = timeRange.start.toISOString().split('T')[0]
        const endDateStr = timeRange.end.toISOString().split('T')[0]
        conditions.push({ require_date: _.and(_.gte(startDateStr), _.lte(endDateStr)) })
      }
    }
    
    // 构建最终查询条件
    const query = conditions.length > 1 ? _.and(conditions) : conditions[0]
    
    console.log('[task-list] 查询条件:', JSON.stringify(query, null, 2))
    
    // 查询数据库
    const result = await db.collection('tasks')
      .where(query)
      .orderBy('require_date', 'asc') // 按截止日期升序，越紧急的越靠前
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
      priority: task.priority || 'P2',
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
      ...(task.subtask_count ? { subtask_count: task.subtask_count } : {}),
      ...(task.progress !== undefined && task.progress !== null ? { progress: task.progress } : {}),
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
