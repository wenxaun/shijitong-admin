// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { range_type = 'all' } = event

  try {
    // 构建查询条件
    let query = {}
    
    const now = new Date()
    const nowTime = now.getTime()
    
    // 时间范围过滤
    if (range_type === 'week') {
      const weekAgo = new Date(nowTime - 7 * 24 * 60 * 60 * 1000)
      query.created_at = _.gte(weekAgo)
    } else if (range_type === 'month') {
      const monthAgo = new Date(nowTime - 30 * 24 * 60 * 60 * 1000)
      query.created_at = _.gte(monthAgo)
    }

    // 查询当前用户的任务（作为执行人或发布人）
    const tasksRes = await db.collection('tasks')
      .where(_.and([
        query,
        _.or([
          { executor_id: wxContext.OPENID },
          { publisher_id: wxContext.OPENID }
        ])
      ]))
      .get()
    
    const tasks = tasksRes.data
    const completedTasks = tasks.filter(t => t.status === 'completed')

    // 计算核心指标
    const totalTasks = tasks.length
    const completedCount = completedTasks.length
    
    // 计算平均分（只计算有分数的已完成任务）
    const scoredTasks = completedTasks.filter(t => t.score !== null && t.score !== undefined)
    const totalScore = scoredTasks.reduce((sum, t) => sum + (t.score || 0), 0)
    const avgScore = scoredTasks.length > 0 ? Math.round(totalScore / scoredTasks.length) : 0
    
    // 计算按时率（分数>=80表示按时完成或提前完成）
    const onTimeTasks = scoredTasks.filter(t => (t.score || 0) >= 80)
    const onTimeRate = scoredTasks.length > 0 ? Math.round((onTimeTasks.length / scoredTasks.length) * 100) : 0

    const metrics = {
      totalTasks,
      completedTasks: completedCount,
      avgScore,
      onTimeRate
    }

    // 分数分布（只统计有分数的任务）
    const scoreDistribution = [
      { 
        range: '100', 
        label: '100分 (满分)',
        count: scoredTasks.filter(t => (t.score || 0) === 100).length, 
        color: '#00B365',
        bgClass: 'bg-green-500'
      },
      { 
        range: '80-99', 
        label: '80-99分 (优秀)',
        count: scoredTasks.filter(t => (t.score || 0) >= 80 && (t.score || 0) < 100).length, 
        color: '#1377EB',
        bgClass: 'bg-blue-500'
      },
      { 
        range: '60-79', 
        label: '60-79分 (合格)',
        count: scoredTasks.filter(t => (t.score || 0) >= 60 && (t.score || 0) < 80).length, 
        color: '#FF7D27',
        bgClass: 'bg-orange-500'
      },
      { 
        range: '0-59', 
        label: '<60分 (待改进)',
        count: scoredTasks.filter(t => (t.score || 0) < 60 && (t.score || 0) >= 0).length, 
        color: '#EA4335',
        bgClass: 'bg-red-500'
      }
    ].map(item => ({
      ...item,
      percentage: scoredTasks.length > 0 ? Math.round((item.count / scoredTasks.length) * 100) : 0
    }))

    // 优先级分布
    const priorityMap = { 'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0 }
    tasks.forEach(t => {
      const p = t.priority || 'P2'
      if (priorityMap.hasOwnProperty(p)) {
        priorityMap[p]++
      }
    })
    
    const priorityDistribution = [
      { priority: 'P0', color: '#EA4335', bgClass: 'bg-red-500', textClass: 'text-red-500' },
      { priority: 'P1', color: '#FF7D27', bgClass: 'bg-orange-500', textClass: 'text-orange-500' },
      { priority: 'P2', color: '#1377EB', bgClass: 'bg-blue-500', textClass: 'text-blue-500' },
      { priority: 'P3', color: '#9CA3AF', bgClass: 'bg-gray-400', textClass: 'text-gray-400' }
    ].map(item => ({
      ...item,
      count: priorityMap[item.priority],
      percentage: totalTasks > 0 ? Math.round((priorityMap[item.priority] / totalTasks) * 100) : 0
    }))

    // 分类统计
    const categoryMap = {}
    completedTasks.forEach(task => {
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
