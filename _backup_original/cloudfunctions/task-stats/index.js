// cloudfunctions/task-stats/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { rangeType = 'all' } = event

  try {
    // 构建查询条件
    let query = { executor_id: wxContext.OPENID }
    
    const now = Date.now()
    if (rangeType === 'week') {
      query.created_at = db.command.gte(now - 7 * 24 * 60 * 60 * 1000)
    } else if (rangeType === 'month') {
      query.created_at = db.command.gte(now - 30 * 24 * 60 * 60 * 1000)
    }
    // all 不添加时间限制

    const tasksRes = await db.collection('tasks').where(query).get()
    const tasks = tasksRes.data

    // 计算核心指标
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const onTimeTasks = tasks.filter(t => (t.score || 0) >= 80).length
    const totalScore = tasks.reduce((sum, t) => sum + (t.score || 0), 0)
    
    const metrics = {
      totalTasks,
      completedTasks,
      avgScore: completedTasks > 0 ? Math.round(totalScore / completedTasks) : 0,
      onTimeRate: completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0
    }

    // 分数分布
    const scoreDistribution = [
      { range: '100', count: tasks.filter(t => (t.score || 0) === 100).length },
      { range: '80-99', count: tasks.filter(t => (t.score || 0) >= 80 && (t.score || 0) < 100).length },
      { range: '60-79', count: tasks.filter(t => (t.score || 0) >= 60 && (t.score || 0) < 80).length },
      { range: '0-59', count: tasks.filter(t => (t.score || 0) < 60).length }
    ]

    // 优先级分布
    const priorityMap = { 'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0 }
    tasks.forEach(t => {
      const p = t.priority || 'P2'
      priorityMap[p] = (priorityMap[p] || 0) + 1
    })
    const priorityDistribution = Object.keys(priorityMap).map(p => ({
      priority: p,
      count: priorityMap[p]
    }))

    // 分类统计
    const categoryMap = {}
    tasks.forEach(task => {
      if (task.attribution_tags && Array.isArray(task.attribution_tags)) {
        task.attribution_tags.forEach(tag => {
          categoryMap[tag] = (categoryMap[tag] || 0) + 1
        })
      }
    })
    const categoryStats = Object.keys(categoryMap).map(tag => ({
      tag,
      count: categoryMap[tag]
    })).sort((a, b) => b.count - a.count)

    return {
      success: true,
      data: {
        metrics,
        scoreDistribution,
        priorityDistribution,
        categoryStats,
        total: tasks.length
      }
    }

  } catch (err) {
    console.error('获取统计失败:', err)
    return {
      success: false,
      message: '获取失败：' + err.message
    }
  }
}
