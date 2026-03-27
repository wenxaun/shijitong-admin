// cloudfunctions/weekly-report/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { week_start, week_end } = event
  
  console.log('[weekly-report] 开始查询周报, OPENID:', wxContext.OPENID)
  console.log('[weekly-report] 查询参数:', event)

  try {
    // 计算本周日期范围
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monday = new Date(today)
    monday.setDate(monday.getDate() - today.getDay() + 1)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    
    const weekStart = week_start || formatDate(monday)
    const weekEnd = week_end || formatDate(sunday)
    
    console.log('[weekly-report] 日期范围:', weekStart, '-', weekEnd)

    // 查询本周完成的任务 - 使用正确的查询语法
    const query = _.and([
      { executor_id: wxContext.OPENID },
      { status: 'completed' },
      { complete_date: _.gte(weekStart) },
      { complete_date: _.lte(weekEnd) }
    ])
    
    console.log('[weekly-report] 查询条件:', JSON.stringify(query))

    const tasksRes = await db.collection('tasks')
      .where(query)
      .orderBy('score', 'desc')
      .get()
    
    console.log('[weekly-report] 查询到的任务数:', tasksRes.data.length)

    const tasks = tasksRes.data
    
    // 计算统计数据
    const totalTasks = tasks.length
    const avgScore = tasks.length > 0 
      ? Math.round(tasks.reduce((sum, t) => sum + (t.score || 0), 0) / tasks.length) 
      : 0
    const highScoreCount = tasks.filter(t => (t.score || 0) >= 80).length
    const lowScoreCount = tasks.filter(t => (t.score || 0) < 80).length

    // 归因统计
    const attributionMap = {}
    tasks.forEach(task => {
      if (task.attribution_tags && Array.isArray(task.attribution_tags)) {
        task.attribution_tags.forEach(tag => {
          attributionMap[tag] = (attributionMap[tag] || 0) + 1
        })
      }
    })

    const attributionStats = Object.keys(attributionMap).map(tag => ({
      tag,
      count: attributionMap[tag]
    })).sort((a, b) => b.count - a.count)
    
    console.log('[weekly-report] 统计结果:', { totalTasks, avgScore, highScoreCount, lowScoreCount })

    return {
      success: true,
      data: {
        weekStart,
        weekEnd,
        tasks,
        stats: {
          totalTasks,
          avgScore,
          highScoreCount,
          lowScoreCount,
          attributionStats
        }
      }
    }

  } catch (err) {
    console.error('[weekly-report] 获取周报失败:', err)
    return {
      success: false,
      message: '获取失败：' + err.message
    }
  }
}

function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
