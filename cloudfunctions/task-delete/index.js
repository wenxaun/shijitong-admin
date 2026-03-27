// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  console.log('[task-delete] 开始删除任务, OPENID:', OPENID)
  console.log('[task-delete] 参数:', event)
  
  try {
    const { task_id } = event
    
    if (!task_id) {
      return {
        success: false,
        message: '任务 ID 为必填项'
      }
    }
    
    // 获取任务
    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data) {
      return {
        success: false,
        message: '任务不存在'
      }
    }
    
    const task = taskRes.data
    console.log('[task-delete] 任务信息:', { task_id, publisher_id: task.publisher_id, is_subtask: task.is_subtask })
    
    // 验证权限（只有发布人能删除，且任务状态为待办）
    if (task.publisher_id !== OPENID) {
      return {
        success: false,
        message: '只有发布人才能删除任务'
      }
    }
    
    if (task.status !== 'pending') {
      return {
        success: false,
        message: '只有待办状态的任务才能删除'
      }
    }
    
    // 如果是主任务，先删除所有子任务
    if (!task.is_subtask) {
      const subtasksRes = await db.collection('tasks').where({
        parent_task_id: task_id,
        is_subtask: true
      }).get()
      
      // 批量删除子任务
      if (subtasksRes.data.length > 0) {
        const deletePromises = subtasksRes.data.map(st => 
          db.collection('tasks').doc(st._id).remove()
        )
        await Promise.all(deletePromises)
        console.log('[task-delete] 已删除子任务数:', subtasksRes.data.length)
      }
    }
    
    // 删除任务
    await db.collection('tasks').doc(task_id).remove()
    
    console.log('[task-delete] 任务删除成功')
    
    return {
      success: true,
      message: '任务删除成功'
    }
    
  } catch (err) {
    console.error('[task-delete] 删除任务失败:', err)
    return {
      success: false,
      message: '删除任务失败：' + err.message,
      errCode: err.errCode
    }
  }
}
