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
  
  console.log('[task-batch-update] 开始批量更新任务')
  console.log('[task-batch-update] 参数:', event)
  
  try {
    const { task_ids, updates } = event
    
    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return {
        success: false,
        message: '任务ID列表不能为空'
      }
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return {
        success: false,
        message: '更新内容不能为空'
      }
    }
    
    // 添加更新时间
    const updateData = {
      ...updates,
      updated_at: new Date()
    }
    
    console.log('[task-batch-update] 更新数据:', updateData)
    console.log('[task-batch-update] 任务数量:', task_ids.length)
    
    // 批量更新任务
    const results = await Promise.all(
      task_ids.map(task_id => 
        db.collection('tasks').doc(task_id).update({
          data: updateData
        }).catch(err => {
          console.error(`[task-batch-update] 更新任务 ${task_id} 失败:`, err)
          return { error: err, task_id }
        })
      )
    )
    
    // 统计成功和失败数量
    const successCount = results.filter(r => !r.error).length
    const failCount = results.filter(r => r.error).length
    
    console.log(`[task-batch-update] 完成: 成功 ${successCount}, 失败 ${failCount}`)
    
    return {
      success: true,
      message: `成功更新 ${successCount} 个任务${failCount > 0 ? `，${failCount} 个失败` : ''}`,
      data: {
        success_count: successCount,
        fail_count: failCount
      }
    }
    
  } catch (err) {
    console.error('[task-batch-update] 批量更新失败:', err)
    return {
      success: false,
      message: '批量更新失败：' + err.message,
      errCode: err.errCode
    }
  }
}
