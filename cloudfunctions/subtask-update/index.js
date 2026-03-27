// cloudfunctions/subtask-update/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { 
    subtask_id,
    task_name,
    task_description,
    executor_id,
    require_date,
    priority,
    status,
    checklist
  } = event

  // 验证必填字段
  if (!subtask_id) {
    return {
      success: false,
      message: '子任务 ID 不能为空'
    }
  }

  try {
    // 检查子任务是否存在
    const subtask = await db.collection('tasks').doc(subtask_id).get()
    if (!subtask.data || !subtask.data.is_subtask) {
      return {
        success: false,
        message: '子任务不存在'
      }
    }

    // 构建更新数据
    const updateData = {
      updated_at: Date.now()
    }

    if (task_name !== undefined) updateData.task_name = task_name
    if (task_description !== undefined) updateData.task_description = task_description
    if (executor_id !== undefined) updateData.executor_id = executor_id
    if (require_date !== undefined) updateData.require_date = require_date
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completed_at = Date.now()
      } else {
        updateData.completed_at = null
      }
    }
    if (checklist !== undefined) {
      updateData.checklist = checklist
    }

    // 更新子任务
    await db.collection('tasks').doc(subtask_id).update({
      data: updateData
    })

    // 如果状态变更，重新计算主任务进度
    if (status !== undefined) {
      const parentTaskId = subtask.data.parent_task_id
      await calcMainTaskProgress(parentTaskId)
    }

    return {
      success: true,
      message: '更新成功'
    }

  } catch (err) {
    console.error('更新子任务失败:', err)
    return {
      success: false,
      message: '更新失败：' + err.message,
      error: err
    }
  }
}

// 计算主任务进度
async function calcMainTaskProgress(taskId) {
  const db = cloud.database()
  
  // 获取所有子任务
  const subtasksRes = await db.collection('tasks')
    .where({ parent_task_id: taskId })
    .get()
  
  const subtasks = subtasksRes.data
  const total = subtasks.length
  const completed = subtasks.filter(s => s.status === 'completed').length
  
  // 计算进度
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  
  // 更新主任务
  await db.collection('tasks').doc(taskId).update({
    data: {
      completed_subtask_count: completed,
      progress: progress,
      updated_at: Date.now()
    }
  })
}
