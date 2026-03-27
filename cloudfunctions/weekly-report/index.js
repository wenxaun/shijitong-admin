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

    // 查询本周完成的任务
    const tasksRes = await db.collection('tasks').where({
      executor_id: wxContext.OPENID,
      status: 'completed',
      complete_date: _.and(_.gte(weekStart), _.lte(weekEnd))
    }).orderBy('score', 'desc').get()

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
    console.error('获取周报失败:', err)
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
