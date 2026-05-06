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
  
  // 第一行就打印日志
  console.log('===== task-create 开始执行 =====')
  console.log('[task-create] 时间:', new Date().toISOString())
  console.log('[task-create] OPENID:', OPENID)
  console.log('[task-create] 参数:', JSON.stringify(event))
  
  try {
    const {
      task_name,
      task_description,
      priority = 'P1',
      category,
      group_id,
      group_name,
      executor_id,
      executor_name,
      require_date,
      source // 新增：任务来源信息
    } = event
    
    // 验证必填字段
    if (!task_name || !require_date) {
      console.log('[task-create] 参数验证失败: 缺少必填字段')
      return {
        success: false,
        message: '任务名称和要求完成日期为必填项'
      }
    }
    
    // 获取当前时间
    const now = new Date()
    
    // 如果没有指定执行人，默认为创建者自己
    const finalExecutorId = executor_id || OPENID
    const finalExecutorName = executor_name || ''
    
    console.log('[task-create] 创建任务:', { task_name, executor_id: finalExecutorId })
    
    // 获取用户类型
    let userType = 'personal'
    try {
      const userRes = await db.collection('users').where({ openid: OPENID }).get()
      if (userRes.data && userRes.data.length > 0) {
        userType = userRes.data[0].user_type || 'personal'
      }
    } catch (err) {
      console.error('[task-create] 获取用户类型失败:', err)
    }
    
    // 构建任务数据
    const taskData = {
      task_name,
      task_description: task_description || '',
      status: 'pending',
      priority,
      category: category || '',
      group_id: group_id || '',
      group_name: group_name || '',
      publisher_id: OPENID,
      executor_id: finalExecutorId,
      executor_name: finalExecutorName,
      user_type: userType, // 添加用户类型字段
      require_date: require_date, // 保持字符串格式 YYYY-MM-DD
      complete_date: null,
      score: null,
      score_note: '',
      learnings: '',
      delay_reason: '',
      improvements: '',
      attribution_tags: [],
      created_at: now,
      updated_at: now,
      _openid: OPENID
    }
    
    // 如果有来源信息，添加到任务数据
    if (source) {
      taskData.source = {
        type: source.type || 'manual',
        source_name: source.source_name || '',
        source_type: source.source_type || undefined,
        original_content: source.original_content || '',
        shared_at: source.shared_at || now.toISOString()
      }
    }
    
    // 创建任务记录
    const result = await db.collection('tasks').add({
      data: taskData
    })
    
    console.log('[task-create] 任务创建成功, task_id:', result._id)
    
    // 创建任务日志
    try {
      await db.collection('task_logs').add({
        data: {
          task_id: result._id,
          action_type: 'create',
          action_detail: JSON.stringify({
            task_name,
            priority,
            executor_name: finalExecutorName,
            require_date
          }),
          operator_id: OPENID,
          operator_name: '',
          created_at: now,
          created_by: OPENID
        }
      })
      console.log('[task-create] 日志记录成功')
    } catch (logErr) {
      console.error('[task-create] 日志记录失败:', logErr)
      // 日志记录失败不影响任务创建
    }
    
    console.log('===== task-create 执行结束 =====')
    
    return {
      success: true,
      message: '任务创建成功',
      data: {
        task_id: result._id,
        task_name,
        status: 'pending',
        executor_id: finalExecutorId
      }
    }
    
  } catch (err) {
    console.error('[task-create] 创建任务失败:', err)
    console.error('[task-create] 错误堆栈:', err.stack)
    return {
      success: false,
      message: '创建任务失败：' + err.message,
      errCode: err.errCode
    }
  }
}
