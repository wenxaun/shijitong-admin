const cloud = require('wx-server-sdk')
const { initCloud, responseWrapper, errorHandler } = require('../common/middleware')

/**
 * 统一推送云函数
 * 功能：自动判断用户类型，优先使用企业微信应用消息，降级到订阅消息
 * 消息类型：
 * - task_transfer: 任务转交通知
 * - task_review: 任务审核通知
 * - task_assign: 任务分配通知
 * - task_remind: 任务提醒
 * - task_complete: 任务完成通知
 */
exports.main = async (event, context) => {
  try {
    // 初始化云开发
    const { db } = await initCloud()

    // 参数验证
    const { to_user_id, message_type, message_data } = event

    if (!to_user_id || !message_type) {
      return responseWrapper({
        success: false,
        message: '参数不完整',
        code: 'MISSING_PARAMS'
      })
    }

    // 查询用户信息
    const userResult = await db.collection('users')
      .where({ openid: to_user_id })
      .field({
        openid: true,
        nickname: true,
        is_wework_user: true,
        wecom_userid: true,
        wecom_corpid: true,
        user_type: true
      })
      .get()

    if (!userResult.data || userResult.data.length === 0) {
      return responseWrapper({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      })
    }

    const user = userResult.data[0]

    let pushResult = null
    let pushMethod = ''

    try {
      // 企业用户：优先使用企业微信应用消息
      if (user.is_wework_user && user.wecom_userid && user.wecom_corpid) {
        pushMethod = 'wecom'
        pushResult = await sendWecomMessage({
          user,
          message_type,
          message_data
        })

        // 如果企业微信推送失败，降级到订阅消息
        if (!pushResult.success) {
          console.log('企业微信推送失败，降级到订阅消息')
          pushMethod = 'subscribe'
          pushResult = await sendSubscribeMessage({
            user,
            message_type,
            message_data
          })
        }
      } else {
        // 个人用户：使用订阅消息
        pushMethod = 'subscribe'
        pushResult = await sendSubscribeMessage({
          user,
          message_type,
          message_data
        })
      }

      // 记录推送日志
      await db.collection('notification_logs').add({
        data: {
          to_user_id,
          user_type: user.user_type,
          message_type,
          message_data,
          push_method: pushMethod,
          success: pushResult.success,
          error: pushResult.error,
          created_at: new Date().toISOString()
        }
      })

      return responseWrapper({
        success: pushResult.success,
        message: pushResult.success ? '推送成功' : '推送失败',
        data: {
          push_method: pushMethod,
          ...pushResult
        }
      })

    } catch (pushError) {
      console.error('消息推送异常:', pushError)

      // 记录推送日志
      await db.collection('notification_logs').add({
        data: {
          to_user_id,
          user_type: user.user_type,
          message_type,
          message_data,
          push_method: pushMethod || 'unknown',
          success: false,
          error: pushError.message || String(pushError),
          created_at: new Date().toISOString()
        }
      })

      return responseWrapper({
        success: false,
        message: '推送异常',
        error: pushError.message
      })
    }

  } catch (error) {
    console.error('推送云函数失败:', error)
    return errorHandler(error)
  }
}

/**
 * 发送企业微信应用消息
 */
async function sendWecomMessage({ user, message_type, message_data }) {
  try {
    const cloud = require('wx-server-sdk')
    const { getWecomAPI } = require('../common/middleware')
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

    // 获取企业微信 API 实例
    const wecomAPI = getWecomAPI(user.wecom_corpid)

    // 构建消息内容
    const message = buildWecomMessage(message_type, message_data)

    // 发送文本消息
    const result = await wecomAPI.message.send({
      touser: user.wecom_userid,
      msgtype: 'text',
      text: message
    })

    return {
      success: result.errcode === 0,
      data: result
    }

  } catch (error) {
    console.error('企业微信推送失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 发送订阅消息
 */
async function sendSubscribeMessage({ user, message_type, message_data }) {
  try {
    const cloud = require('wx-server-sdk')
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

    // 构建订阅消息内容
    const message = buildSubscribeMessage(message_type, message_data)

    // 检查是否有对应的订阅模板
    const templateMap = {
      task_transfer: 'TASK_TRANSFER_TEMPLATE',
      task_review: 'TASK_REVIEW_TEMPLATE',
      task_assign: 'TASK_ASSIGN_TEMPLATE',
      task_remind: 'TASK_REMIND_TEMPLATE',
      task_complete: 'TASK_COMPLETE_TEMPLATE'
    }

    const templateId = templateMap[message_type]
    if (!templateId) {
      return {
        success: false,
        error: '未找到对应的消息模板'
      }
    }

    // 发送订阅消息
    const result = await cloud.openapi.subscribeMessage.send({
      touser: user.openid,
      templateId,
      page: `/pages/detail/index?taskId=${message_data.task_id}`,
      data: message
    })

    return {
      success: result.errcode === 0,
      data: result
    }

  } catch (error) {
    console.error('订阅消息推送失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 构建企业微信消息内容
 */
function buildWecomMessage(message_type, message_data) {
  const contentMap = {
    task_transfer: `【任务转交】\n任务：${message_data.task_name}\n从：${message_data.from_user_name}\n${message_data.reason ? '原因：' + message_data.reason : ''}\n请及时查看处理`,
    task_review: `【任务审核】\n任务：${message_data.task_name}\n审核结果：${message_data.action === 'approve' ? '通过' : message_data.action === 'reject' ? '拒绝' : '需补充材料'}\n${message_data.comment ? '审核意见：' + message_data.comment : ''}`,
    task_assign: `【任务分配】\n任务：${message_data.task_name}\n${message_data.deadline ? '截止时间：' + message_data.deadline : ''}\n请及时查看处理`,
    task_remind: `【任务提醒】\n任务：${message_data.task_name}\n${message_data.deadline ? '截止时间：' + message_data.deadline : ''}\n请及时完成`,
    task_complete: `【任务完成】\n任务：${message_data.task_name}\n已完成`
  }

  return {
    content: contentMap[message_type] || '您有一条新的任务通知'
  }
}

/**
 * 构建订阅消息内容
 */
function buildSubscribeMessage(message_type, message_data) {
  const dataMap = {
    task_transfer: {
      thing1: { value: message_data.task_name || '任务转交' },
      thing2: { value: message_data.from_user_name || '未知' },
      thing3: { value: message_data.reason || '任务转交' }
    },
    task_review: {
      thing1: { value: message_data.task_name || '任务审核' },
      phrase2: { value: message_data.action === 'approve' ? '通过' : message_data.action === 'reject' ? '拒绝' : '需补充材料' },
      thing3: { value: message_data.comment || '无' }
    },
    task_assign: {
      thing1: { value: message_data.task_name || '任务分配' },
      time2: { value: message_data.deadline || new Date().toLocaleDateString() },
      thing3: { value: '请及时查看处理' }
    },
    task_remind: {
      thing1: { value: message_data.task_name || '任务提醒' },
      time2: { value: message_data.deadline || new Date().toLocaleDateString() },
      thing3: { value: '请及时完成' }
    },
    task_complete: {
      thing1: { value: message_data.task_name || '任务完成' },
      time2: { value: new Date().toLocaleDateString() },
      thing3: { value: '已完成' }
    }
  }

  return dataMap[message_type] || {}
}
