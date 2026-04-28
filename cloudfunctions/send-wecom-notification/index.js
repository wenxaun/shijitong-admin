/**
 * 企业微信消息推送云函数
 * 优先使用企业微信应用消息推送（触达率远高于微信订阅消息）
 * 微信订阅消息作为补充
 */

const cloud = require('wx-server-sdk')
const {
  logRequest,
  logResponse,
  success,
  error,
  errorHandler,
  COLLECTIONS
} = require('../common/middleware')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 发送企业微信应用消息
 */
async function sendWecomMessage(toUser, message) {
  try {
    console.log('[sendWecomMessage] 发送企业微信应用消息')

    const params = {
      touser: toUser, // 企业微信成员 UserID
      msgtype: 'text', // 消息类型
      agentid: message.agentid || process.env.WECOM_AGENT_ID || 0, // 企业应用的 id
      text: {
        content: message.content || ''
      },
      safe: message.safe || 0 // 是否是保密消息
    }

    // 使用云调用发送消息
    await cloud.openapi.qywx.sendMessage(params)

    console.log('[sendWecomMessage] 企业微信消息发送成功')
    return { success: true, method: 'wecom' }

  } catch (err) {
    console.error('[sendWecomMessage] 企业微信消息发送失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 发送微信订阅消息（作为补充）
 */
async function sendSubscribeMessage(toUser, message) {
  try {
    console.log('[sendSubscribeMessage] 发送微信订阅消息')

    const params = {
      touser: toUser, // 接收者的 openid
      templateId: message.templateId || process.env.WX_TEMPLATE_ID,
      page: message.page || 'pages/index/index',
      data: message.data || {},
      miniprogramState: 'formal' // 正式版
    }

    // 使用云调用发送订阅消息
    await cloud.openapi.subscribeMessage.send(params)

    console.log('[sendSubscribeMessage] 订阅消息发送成功')
    return { success: true, method: 'subscribe' }

  } catch (err) {
    console.error('[sendSubscribeMessage] 订阅消息发送失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 消息类型映射
 */
const MESSAGE_TEMPLATES = {
  task_assigned: {
    title: '任务分配通知',
    content: '您收到了新任务：{task_name}\n截止日期：{require_date}\n优先级：{priority}'
  },
  task_completed: {
    title: '任务完成通知',
    content: '任务已完成：{task_name}\n完成人：{executor_name}\n完成时间：{complete_time}'
  },
  task_overdue: {
    title: '任务逾期提醒',
    content: '您的任务已逾期：{task_name}\n截止日期：{require_date}\n请尽快处理'
  },
  task_reminder: {
    title: '任务提醒',
    content: '任务即将到期：{task_name}\n截止日期：{require_date}\n剩余时间：{days_left}天'
  }
}

/**
 * 格式化消息内容
 */
function formatMessage(type, data) {
  const template = MESSAGE_TEMPLATES[type] || MESSAGE_TEMPLATES.task_assigned
  let content = template.content

  // 替换占位符
  for (const key in data) {
    const placeholder = `{${key}}`
    content = content.replace(new RegExp(placeholder, 'g'), data[key])
  }

  return {
    title: template.title,
    content: content
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  logRequest('send-wecom-notification', event)

  const { to_user, message_type, message_data, force_method } = event
  const wxContext = cloud.getWXContext()

  // 验证参数
  if (!to_user) {
    return error('缺少接收用户ID')
  }

  if (!message_type) {
    return error('缺少消息类型')
  }

  try {
    // 1. 格式化消息内容
    const formattedMessage = formatMessage(message_type, message_data)

    // 2. 判断用户类型
    const userResult = await db.collection(COLLECTIONS.USERS)
      .where({
        $or: [
          { openid: to_user },
          { userid: to_user }
        ]
      })
      .limit(1)
      .get()

    if (userResult.data.length === 0) {
      return error('用户不存在')
    }

    const user = userResult.data[0]
    const isWecomUser = user.user_type === 'enterprise'

    let sendResult = null

    // 3. 优先使用企业微信应用消息（针对企业用户）
    if (isWecomUser && force_method !== 'subscribe') {
      sendResult = await sendWecomMessage(user.userid, {
        content: formattedMessage.content,
        agentid: message_data.agentid
      })

      // 企业微信消息失败，降级到订阅消息
      if (!sendResult.success) {
        console.log('[send-wecom-notification] 企业微信消息失败，尝试订阅消息')
        sendResult = await sendSubscribeMessage(user.openid, {
          ...message_data.subscribeData
        })
      }
    } else {
      // 个人用户或强制使用订阅消息
      sendResult = await sendSubscribeMessage(user.openid, {
        ...message_data.subscribeData
      })
    }

    // 4. 记录消息日志
    await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      data: {
        to_user: to_user,
        to_openid: user.openid,
        to_userid: user.userid,
        user_type: user.user_type,
        message_type: message_type,
        title: formattedMessage.title,
        content: formattedMessage.content,
        send_method: sendResult.method || 'failed',
        status: sendResult.success ? 'sent' : 'failed',
        error: sendResult.error || null,
        message_data: message_data,
        created_at: new Date()
      }
    })

    const result = sendResult.success
      ? success('消息发送成功', {
          send_method: sendResult.method,
          message_type: message_type
        })
      : error('消息发送失败')

    logResponse('send-wecom-notification', result)
    return result

  } catch (err) {
    const errorResult = errorHandler(err, '消息推送')
    logResponse('send-wecom-notification', errorResult)
    return errorResult
  }
}
