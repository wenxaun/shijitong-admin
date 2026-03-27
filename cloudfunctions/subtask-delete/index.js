// cloudfunctions/subtask-delete/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { subtask_id } = event

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

    const parentTaskId = subtask.data.parent_task_id

    // 删除子任务
    await db.collection('tasks').doc(subtask_id).remove()

    // 更新主任务的子任务计数
    await db.collection('tasks').doc(parentTaskId).update({
      data: {
        subtask_count: _.inc(-1),
        updated_at: Date.now()
      }
    })

    // 重新计算主任务进度
    await calcMainTaskProgress(parentTaskId)

    return {
      success: true,
      message: '删除成功'
    }

  } catch (err) {
    console.error('删除子任务失败:', err)
    return {
      success: false,
      message: '删除失败：' + err.message,
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
