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
    const {
      task_id,
      exception_reason,
      need_delay,
      delay_date
    } = event
    
    if (!task_id || !exception_reason) {
      return {
        success: false,
        message: '任务 ID 和异常原因为必填项'
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
    
    // 验证权限（执行人才能上报）
    if (task.executor_id !== OPENID) {
      return {
        success: false,
        message: '只有执行人才能上报异常'
      }
    }
    
    // 构建更新数据
    const updateData = {
      exception_reported: true,
      exception_reason: exception_reason,
      exception_time: new Date(),
      need_delay: need_delay || false
    }
    
    if (need_delay === true && delay_date) {
      updateData.delay_date = new Date(delay_date)
      updateData.delay_approved = false  // 待发布人审批
    }
    
    // 更新任务
    await db.collection('tasks').doc(task_id).update({
      data: updateData
    })
    
    // TODO: 通知发布人（后续可通过订阅消息实现）
    
    return {
      success: true,
      message: need_delay === true ? '异常已上报，延期申请待审批' : '异常已上报',
      data: {
        task_id,
        exception_reason,
        need_delay,
        delay_date
      }
    }
    
  } catch (err) {
    console.error('上报异常失败:', err)
    return {
      success: false,
      message: '上报失败：' + err.message,
      errCode: err.errCode
    }
  }
}
