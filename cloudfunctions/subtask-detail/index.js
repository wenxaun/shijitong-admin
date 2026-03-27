// 云函数入口文件 - 获取子任务详情
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
  
  try {
    const { subtask_id } = event
    
    if (!subtask_id) {
      return {
        success: false,
        message: '子任务 ID 为必填项'
      }
    }
    
    // 查询子任务详情
    const subtaskRes = await db.collection('tasks').doc(subtask_id).get()
    
    if (!subtaskRes.data) {
      return {
        success: false,
        message: '子任务不存在'
      }
    }
    
    const subtask = subtaskRes.data
    
    // 验证是子任务
    if (!subtask.is_subtask) {
      return {
        success: false,
        message: '该任务不是子任务'
      }
    }
    
    // 获取执行人信息
    let executorName = '未分配'
    if (subtask.executor_id) {
      const userRes = await db.collection('users')
        .where({
          openid: subtask.executor_id
        })
        .field({
          nickname: true
        })
        .get()
      
      if (userRes.data.length > 0) {
        executorName = userRes.data[0].nickname || '未知用户'
      }
    }
    
    // 获取主任务信息
    let parentTaskName = ''
    if (subtask.parent_task_id) {
      const parentRes = await db.collection('tasks').doc(subtask.parent_task_id).get()
      if (parentRes.data) {
        parentTaskName = parentRes.data.task_name
      }
    }
    
    // 检查逾期
    let isOverdue = false
    if (subtask.require_date && subtask.status !== 'completed') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const requireDate = new Date(subtask.require_date)
      requireDate.setHours(0, 0, 0, 0)
      isOverdue = requireDate < today
    }
    
    return {
      success: true,
      data: {
        subtask: {
          _id: subtask._id,
          task_name: subtask.task_name,
          task_description: subtask.task_description || '',
          status: subtask.status,
          priority: subtask.priority || 'P2',
          executor_id: subtask.executor_id,
          executor_name: executorName,
          require_date: subtask.require_date,
          checklist: subtask.checklist || [],
          created_at: subtask.created_at,
          updated_at: subtask.updated_at,
          completed_at: subtask.completed_at,
          is_overdue: isOverdue,
          parent_task_id: subtask.parent_task_id,
          parent_task_name: parentTaskName
        }
      }
    }
    
  } catch (err) {
    console.error('获取子任务详情失败:', err)
    return {
      success: false,
      message: '获取子任务详情失败：' + err.message,
      errCode: err.errCode
    }
  }
}
