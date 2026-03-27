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
    
    // 验证权限（只有发布人能删除）
    if (task.publisher_id !== OPENID) {
      return {
        success: false,
        message: '只有发布人才能删除任务'
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
        console.log(`已删除 ${subtasksRes.data.length} 个子任务`)
      }
    }
    
    // 删除任务
    await db.collection('tasks').doc(task_id).remove()
    
    return {
      success: true,
      message: '任务删除成功'
    }
    
  } catch (err) {
    console.error('删除任务失败:', err)
    return {
      success: false,
      message: '删除任务失败：' + err.message,
      errCode: err.errCode
    }
  }
}
