// cloudfunctions/weekly-report/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { week_start, week_end } = event

  try {
    // 查询本周完成的任务
    const tasksRes = await db.collection('tasks').where({
      executor_id: wxContext.OPENID,
      status: 'completed',
      complete_date: db.command.gte(week_start || '2026-01-01'),
      complete_date: db.command.lte(week_end || '2099-12-31')
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
