// cloudfunctions/subtask-create/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { 
    task_id, 
    title, 
    description, 
    executor_id, 
    require_date,
    priority = 'P2'
  } = event

  // 验证必填字段
  if (!task_id || !title) {
    return {
      success: false,
      message: '任务 ID 和标题不能为空'
    }
  }

  try {
    // 检查主任务是否存在
    const mainTask = await db.collection('tasks').doc(task_id).get()
    if (!mainTask.data) {
      return {
        success: false,
        message: '主任务不存在'
      }
    }

    // 检查主任务是否是子任务（不允许嵌套）
    if (mainTask.data.is_subtask) {
      return {
        success: false,
        message: '子任务不能再创建子任务'
      }
    }

    // 生成子任务 ID
    const subtaskId = `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 创建子任务记录到 tasks 表（用 is_subtask 标识）
    await db.collection('tasks').add({
      data: {
        _id: subtaskId,
        task_name: title,
        task_description: description || '',
        is_subtask: true,
        parent_task_id: task_id,
        executor_id: executor_id || wxContext.OPENID,
        publisher_id: wxContext.OPENID,
        require_date: require_date,
        priority: priority,
        status: 'pending',
        progress: 0,
        checklist: [],  // 清单数组
        created_at: Date.now(),
        updated_at: Date.now()
      }
    })

    // 更新主任务的子任务计数
    await db.collection('tasks').doc(task_id).update({
      data: {
        subtask_count: _.inc(1),
        updated_at: Date.now()
      }
    })

    // 重新计算主任务进度
    await calcMainTaskProgress(task_id)

    return {
      success: true,
      message: '创建成功',
      subtask_id: subtaskId
    }

  } catch (err) {
    console.error('创建子任务失败:', err)
    return {
      success: false,
      message: '创建失败：' + err.message,
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
