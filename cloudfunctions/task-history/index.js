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
  
  const {
    type = 'created', // created: 我创建的, executed: 我执行的, deleted: 已删除
    page = 1,
    pageSize = 20,
    time_filter, // today, week, month - 统一按截止日期筛选
    start_date,
    end_date
  } = event

  try {
    let query = {}
    
    // 历史任务默认只查询已完成的任务
    if (type === 'created') {
      // 我创建的任务（已完成/已取消）
      query = {
        publisher_id: OPENID,
        status: _.in(['completed', 'cancelled'])
      }
    } else if (type === 'executed') {
      // 我执行的任务（已完成/已取消）
      query = {
        executor_id: OPENID,
        status: _.in(['completed', 'cancelled'])
      }
    } else if (type === 'deleted') {
      // 已删除的任务
      query = {
        publisher_id: OPENID,
        is_deleted: true
      }
    }
    
    // 时间筛选：统一按截止日期（require_date）筛选
    if (time_filter) {
      const timeRange = getTimeRange(time_filter)
      if (timeRange) {
        query.require_date = _.and(_.gte(timeRange.start), _.lte(timeRange.end))
      }
    }
    
    // 自定义日期范围筛选（按截止日期）
    if (start_date && end_date) {
      const startDateTime = new Date(start_date + ' 00:00:00')
      const endDateTime = new Date(end_date + ' 23:59:59')
      query.require_date = _.and(_.gte(startDateTime), _.lte(endDateTime))
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
      group_id: task.group_id || '',
      group_name: task.group_name || '',
      publisher_id: task.publisher_id,
      executor_id: task.executor_id,
      executor_name: task.executor_name || '',
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
