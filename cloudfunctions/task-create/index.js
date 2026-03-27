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
      executor_id,
      executor_name,
      require_date
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
    
    // 创建任务记录 - 统一使用字符串格式存储日期
    const result = await db.collection('tasks').add({
      data: {
        task_name,
        task_description: task_description || '',
        status: 'pending',
        priority,
        category: category || '',
        publisher_id: OPENID,
        executor_id: finalExecutorId,
        executor_name: finalExecutorName,
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
    })
    
    console.log('[task-create] 任务创建成功, task_id:', result._id)
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
