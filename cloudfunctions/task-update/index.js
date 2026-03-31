// 云函数入口文件
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
  
  console.log('[task-update] 开始更新任务, OPENID:', OPENID)
  console.log('[task-update] 参数:', event)
  
  try {
    const {
      task_id,
      status,
      priority,
      category,
      group_id,
      group_name,
      require_date,
      learnings,
      delay_reason,
      improvements,
      attribution_tags,
      calculate_score_only = false,
      skip_review_check = false,
      task_name,
      task_description,
      executor_id,
      executor_name
    } = event
    
    if (!task_id) {
      return {
        success: false,
        message: '任务 ID 为必填项'
      }
    }
    
    // 获取当前任务
    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data) {
      return {
        success: false,
        message: '任务不存在'
      }
    }
    
    const task = taskRes.data
    
    // 验证权限（执行人或发布人才能更新）
    const isExecutor = (task.executor_id === OPENID)
    const isPublisher = (task.publisher_id === OPENID)
    
    console.log('[task-update] 权限检查:', {
      task_executor: task.executor_id,
      task_publisher: task.publisher_id,
      current_openid: OPENID,
      is_executor: isExecutor,
      is_publisher: isPublisher
    })
    
    if (!isExecutor && !isPublisher) {
      return {
        success: false,
        message: '无权限操作此任务（非执行人或发布人）'
      }
    }
    
    // 如果只计算得分，不更新数据库
    if (calculate_score_only) {
      const scoreResult = calculateScore(task.require_date, new Date())
      return {
        success: true,
        message: '得分计算完成',
        data: {
          score: scoreResult.score,
          score_note: scoreResult.note
        }
      }
    }
    
    // 构建更新数据
    const updateData = {
      updated_at: new Date()
    }
    
    // 编辑任务字段（仅发布人可修改）
    if (task_name !== undefined) updateData.task_name = task_name
    if (task_description !== undefined) updateData.task_description = task_description
    if (executor_id !== undefined) updateData.executor_id = executor_id
    if (executor_name !== undefined) updateData.executor_name = executor_name
    
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (category !== undefined) updateData.category = category
    if (group_id !== undefined) updateData.group_id = group_id
    if (group_name !== undefined) updateData.group_name = group_name
    // 统一使用字符串格式存储日期
    if (require_date !== undefined) updateData.require_date = require_date
    if (learnings !== undefined) updateData.learnings = learnings || ''
    if (delay_reason !== undefined) updateData.delay_reason = delay_reason || ''
    if (improvements !== undefined) updateData.improvements = improvements || ''
    if (attribution_tags !== undefined) updateData.attribution_tags = attribution_tags || []
    
    // 如果状态变为已完成，自动计算得分
    if (status === 'completed' && task.status !== 'completed') {
      // 统一使用字符串格式
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      updateData.complete_date = todayStr
      
      const scoreResult = calculateScore(task.require_date, today)
      updateData.score = scoreResult.score
      updateData.score_note = scoreResult.note
      
      console.log('[task-update] 计算得分:', scoreResult)
      
      // 如果得分<80，检查必填字段（除非跳过复盘验证）
      if (scoreResult.score < 80 && !skip_review_check) {
        if (!learnings && !task.learnings) {
          return {
            success: false,
            message: '得分低于 80 分，学习收获为必填项'
          }
        }
        if (!delay_reason && !task.delay_reason) {
          return {
            success: false,
            message: '得分低于 80 分，延迟原因为必填项'
          }
        }
        if (!improvements && !task.improvements) {
          return {
            success: false,
            message: '得分低于 80 分，反思改进为必填项'
          }
        }
        if (!attribution_tags || attribution_tags.length === 0) {
          return {
            success: false,
            message: '得分低于 80 分，归因分类为必填项'
          }
        }
      }
    }
    
    console.log('[task-update] 准备更新数据:', updateData)
    
    // 更新数据库
    const updateResult = await db.collection('tasks').doc(task_id).update({
      data: updateData
    })
    
    console.log('[task-update] 更新结果:', updateResult)
    
    // 重新读取任务，确认数据已保存
    const updatedTask = await db.collection('tasks').doc(task_id).get()
    console.log('[task-update] 更新后的任务:', updatedTask.data)
    
    return {
      success: true,
      message: '任务更新成功',
      data: {
        task_id,
        score: updatedTask.data.score,
        score_note: updatedTask.data.score_note,
        status: updatedTask.data.status,
        learnings: updatedTask.data.learnings,
        attribution_tags: updatedTask.data.attribution_tags
      }
    }
    
  } catch (err) {
    console.error('[task-update] 更新任务失败:', err)
    return {
      success: false,
      message: '更新任务失败：' + err.message,
      errCode: err.errCode
    }
  }
}

// 计算得分函数
function calculateScore(requireDate, completeDate) {
  // 处理字符串格式的日期
  const require = typeof requireDate === 'string' ? new Date(requireDate) : new Date(requireDate)
  const complete = new Date(completeDate)
  
  // 重置时间为0点，只比较日期
  require.setHours(0, 0, 0, 0)
  complete.setHours(0, 0, 0, 0)
  
  // 计算天数差
  const diffTime = complete.getTime() - require.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  let score, note
  
  if (diffDays < 0) {
    // 提前完成
    score = 100
    note = `提前${Math.abs(diffDays)}天完成`
  } else if (diffDays === 0) {
    // 按时完成
    score = 80
    note = '按时完成'
  } else {
    // 延迟完成
    if (diffDays === 1) {
      score = 79
      note = '延迟 1 天'
    } else if (diffDays <= 3) {
      score = Math.max(60, 79 - (diffDays - 1) * 10)
      note = `延迟${diffDays}天`
    } else if (diffDays <= 7) {
      score = Math.max(45, 60 - (diffDays - 3) * 5)
      note = `延迟${diffDays}天`
    } else {
      score = 30
      note = `延迟超过 1 周（${diffDays}天）`
    }
  }
  
  return { score, note }
}
