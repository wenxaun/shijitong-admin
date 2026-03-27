// 云函数入口文件 - 检查子任务完成状态
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  try {
    const {
      parent_task_id
    } = event
    
    if (!parent_task_id) {
      return {
        success: false,
        message: '主任务 ID 为必填项'
      }
    }
    
    // 获取主任务信息
    const parentTaskRes = await db.collection('tasks').doc(parent_task_id).get()
    if (!parentTaskRes.data) {
      return {
        success: false,
        message: '主任务不存在'
      }
    }
    
    const parentTask = parentTaskRes.data
    
    // 查询所有子任务
    const subtasksRes = await db.collection('tasks')
      .where({
        parent_task_id: parent_task_id,
        is_subtask: true
      })
      .get()
    
    const total = subtasksRes.data.length
    const completed = subtasksRes.data.filter(t => t.status === 'completed').length
    const inProgress = subtasksRes.data.filter(t => t.status === 'in_progress').length
    const pending = subtasksRes.data.filter(t => t.status === 'pending').length
    
    // 检查是否全部完成
    const allCompleted = total > 0 && completed === total
    
    // 获取子任务列表（含执行人信息）
    const executorIds = [...new Set(subtasksRes.data.map(t => t.executor_id))]
    const usersMap = {}
    
    if (executorIds.length > 0) {
      const usersRes = await db.collection('users')
        .where({
          openid: db.command.in(executorIds)
        })
        .field({
          openid: true,
          nickname: true
        })
        .get()
      
      usersRes.data.forEach(u => {
        usersMap[u.openid] = u.nickname
      })
    }
    
    const subtasks = subtasksRes.data.map(task => ({
      subtask_id: task._id,
      task_name: task.task_name,
      executor_name: usersMap[task.executor_id] || '未知',
      status: task.status,
      require_date: task.require_date
    }))
    
    return {
      success: true,
      data: {
        has_subtasks: total > 0,
        total,
        completed,
        in_progress: inProgress,
        pending,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        all_completed: allCompleted,
        subtasks,
        parent_task: {
          task_id: parent_task._id,
          task_name: parentTask.task_name,
          status: parentTask.status,
          executor_id: parentTask.executor_id
        }
      }
    }
    
  } catch (err) {
    console.error('检查子任务完成状态失败:', err)
    return {
      success: false,
      message: '检查子任务完成状态失败：' + err.message,
      errCode: err.errCode
    }
  }
}
