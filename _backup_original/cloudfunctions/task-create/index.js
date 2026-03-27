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
  
  try {
    const {
      task_name,
      task_description,
      priority = 'P1',
      category,
      executor_id,
      require_date
    } = event
    
    // 验证必填字段
    if (!task_name || !require_date) {
      return {
        success: false,
        message: '任务名称和要求完成日期为必填项'
      }
    }
    
    // 获取当前时间
    const now = new Date()
    
    // 如果没有指定执行人，默认为创建者自己
    const finalExecutorId = executor_id || OPENID
    
    // 创建任务记录
    const result = await db.collection('tasks').add({
      data: {
        task_name,
        task_description: task_description || '',
        status: 'pending', // pending, in_progress, completed, cancelled
        priority, // P0, P1, P2, P3
        category: category || '',
        publisher_id: OPENID,
        executor_id: finalExecutorId,
        require_date: new Date(require_date),
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
    
    // TODO: 发送通知给执行人（后续可通过订阅消息实现）
    
    return {
      success: true,
      message: '任务创建成功' + (executor_id ? '，已分配给执行人' : ''),
      task_id: result._id,
      data: {
        task_id: result._id,
        task_name,
        status: 'pending',
        executor_id: finalExecutorId,
        created_at: now
      }
    }
    
  } catch (err) {
    console.error('创建任务失败:', err)
    return {
      success: false,
      message: '创建任务失败：' + err.message,
      errCode: err.errCode
    }
  }
}
