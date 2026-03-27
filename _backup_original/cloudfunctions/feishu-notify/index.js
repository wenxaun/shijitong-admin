// 云函数入口文件 - 飞书通知
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 飞书机器人 Webhook 地址（编程虾）
const FEISHU_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx-xxxxx-xxxxx-xxxxx-xxxxx'

// MiniMax API 配置
const MINIMAX_API_URL = 'https://api.minimaxi.chat/v1/text/chatcompletion_pro'
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  try {
    const {
      type,           // 通知类型: subtask_created, subtask_flow, subtask_completed, subtask_deleted
      subtask_id,
      task_name,
      parent_task_name,
      from_executor_name,
      to_executor_name,
      to_user_openid,
      reason,
      require_date
    } = event
    
    if (!type || !subtask_id) {
      return {
        success: false,
        message: '缺少必要参数'
      }
    }
    
    // 构建通知消息
    const notifyConfig = getNotifyConfig(type, {
      task_name,
      parent_task_name,
      from_executor_name,
      to_executor_name,
      reason,
      require_date
    })
    
    // 生成 AI 优化消息
    if (notifyConfig.ai_template) {
      try {
        const aiMessage = await generateAIMessage(notifyConfig.ai_template, notifyConfig.variables)
        notifyConfig.message = aiMessage
      } catch (err) {
        console.error('AI 消息生成失败，使用默认消息:', err)
        // 使用默认消息
      }
    }
    
    // 发送到飞书
    const result = await sendFeishuNotify(notifyConfig)
    
    return {
      success: true,
      message: '通知已发送',
      data: result
    }
    
  } catch (err) {
    console.error('发送飞书通知失败:', err)
    return {
      success: false,
      message: '发送通知失败：' + err.message,
      errCode: err.errCode
    }
  }
}

// 获取通知配置
function getNotifyConfig(type, data) {
  const configs = {
    subtask_created: {
      ai_template: `您有一个新的子任务需要执行：

📋 主任务：{parent_task_name}
📌 子任务：{task_name}
⏰ 截止日期：{require_date}
👤 分配者：{from_executor_name}

请及时查看并开始执行。`,
      variables: data,
      message: ''
    },
    subtask_flow: {
      ai_template: `🔄 任务流转通知

📋 主任务：{parent_task_name}
📌 子任务：{task_name}
👤 原执行人：{from_executor_name}
👤 新执行人：{to_executor_name}
📝 流转原因：{reason || '无'}

请确认接收任务。`,
      variables: data,
      message: ''
    },
    subtask_completed: {
      ai_template: `✅ 子任务已完成

📋 主任务：{parent_task_name}
📌 子任务：{task_name}
👤 执行人：{from_executor_name}

主任务整体进度已更新。`,
      variables: data,
      message: ''
    },
    subtask_deleted: {
      ai_template: `🗑️ 子任务已删除

📋 主任务：{parent_task_name}
📌 子任务：{task_name}
👤 操作者：{from_executor_name}

该子任务已被删除。`,
      variables: data,
      message: ''
    }
  }
  
  return configs[type] || { message: '未知通知类型' }
}

// 生成 AI 优化消息
async function generateAIMessage(template, variables) {
  if (!MINIMAX_API_KEY) {
    // 没有 API Key，使用模板填充
    return fillTemplate(template, variables)
  }
  
  const prompt = `请将以下通知模板优化，使其更加简洁、专业、有条理，保留关键信息：

${fillTemplate(template, variables)}

要求：
1. 不超过 200 字
2. 使用 Emoji 增加可读性
3. 突出关键信息（任务名、截止日期等）
4. 语气友好但专业`

  const response = await makeMinimaxRequest(prompt)
  return response
}

// 填充模板变量
function fillTemplate(template, variables) {
  let result = template
  for (const key in variables) {
    const value = variables[key] || '未填写'
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

// 调用 MiniMax API
function makeMinimaxRequest(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'MiniMax-Text-01',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    })
    
    const url = new URL(MINIMAX_API_URL)
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      }
    }
    
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          if (result.choices && result.choices[0] && result.choices[0].message) {
            resolve(result.choices[0].message.content)
          } else {
            reject(new Error('API 返回格式错误'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// 发送飞书通知
async function sendFeishuNotify(config) {
  return new Promise((resolve, reject) => {
    const payload = {
      msg_type: 'text',
      content: {
        text: config.message
      }
    }
    
    const data = JSON.stringify(payload)
    
    const url = new URL(FEISHU_WEBHOOK)
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }
    
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          if (result.code === 0 || result.StatusCode === 0) {
            resolve({ success: true, result })
          } else {
            reject(new Error(`飞书 API 错误: ${result.msg || JSON.stringify(result)}`))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}
