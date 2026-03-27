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
      delay_date,
      executor_name
    } = event
    
    if (!task_id) {
      return {
        success: false,
        message: '任务 ID 为必填项'
      }
    }
    
    // 获取任务信息
    const taskRes = await db.collection('tasks').doc(task_id).get()
    if (!taskRes.data) {
      return {
        success: false,
        message: '任务不存在'
      }
    }
    
    const task = taskRes.data
    const publisherOpenid = task.publisher_id
    
    // 获取发布人的订阅消息设置
    const publisherSettings = await db.collection('userSettings').where({
      openid: publisherOpenid
    }).get()
    
    const receiveExceptionNotify = publisherSettings.data.length > 0 
      ? publisherSettings.data[0].receiveExceptionNotify !== false 
      : true // 默认接收
    
    if (!receiveExceptionNotify) {
      return {
        success: true,
        message: '发布人关闭了异常通知',
        notified: false
      }
    }
    
    // 发送订阅消息给发布人
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: publisherOpenid,
        templateId: 'YOUR_TEMPLATE_ID', // 需要替换为实际的模板 ID
        page: 'pages/detail/detail?id=' + task_id,
        data: {
          thing1: { value: task.task_name },
          thing2: { value: exception_reason },
          time3: { value: new Date().toLocaleString('zh-CN') },
          thing4: { value: executor_name || '执行人' },
          phrase5: { value: need_delay ? '已申请延期' : '正常推进' }
        }
      })
      
      console.log('订阅消息发送成功')
      
      return {
        success: true,
        message: '异常已上报并通知发布人',
        notified: true
      }
      
    } catch (sendErr) {
      console.error('发送订阅消息失败:', sendErr)
      
      // 发送失败但数据已保存，返回成功
      return {
        success: true,
        message: '异常已上报（通知发送失败）',
        notified: false,
        error: sendErr.message
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
