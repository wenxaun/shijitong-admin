// 云函数入口文件 - 语音识别 + NLP 解析
const cloud = require('wx-server-sdk')
const tencentcloud = require("tencentcloud-sdk-nodejs")
const fs = require('fs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 腾讯云配置（从环境变量读取，避免暴露）
const TENCENTCLOUD_SECRETID = process.env.TENCENTCLOUD_SECRETID || '你的 SecretId'
const TENCENTCLOUD_SECRETKEY = process.env.TENCENTCLOUD_SECRETKEY || '你的 SecretKey'

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  try {
    const { audioFilePath } = event
    
    if (!audioFilePath) {
      return {
        success: false,
        message: '请提供音频文件路径'
      }
    }
    
    // 1. 下载音频文件
    const fileStream = await cloud.downloadFile({
      fileID: audioFilePath
    })
    
    // 2. 调用腾讯云语音识别
    const AsrClient = tencentcloud.asr.v20190614.Client
    const client = new AsrClient({
      credential: {
        secretId: TENCENTCLOUD_SECRETID,
        secretKey: TENCENTCLOUD_SECRETKEY
      },
      region: "ap-guangzhou",
      profile: {
        httpProfile: {
          endpoint: "asr.tencentcloudapi.com"
        }
      }
    })
    
    // 3. 语音识别请求
    const params = {
      EngineModelType: "16k_zh",
      ChannelNum: 1,
      ResTextFormat: 0,
      SourceType: 0,
      Data: fileStream.fileContent.toString('base64')
    }
    
    const recognizeResponse = await client.SentenceRecognition(params)
    const recognizedText = recognizeResponse.Result
    
    console.log('识别结果:', recognizedText)
    
    // 4. NLP 智能解析
    const parsedData = parseTaskFromVoice(recognizedText)
    
    return {
      success: true,
      message: '识别成功',
      data: {
        originalText: recognizedText,
        parsed: parsedData
      }
    }
    
  } catch (err) {
    console.error('语音识别失败:', err)
    return {
      success: false,
      message: '识别失败：' + err.message,
      errCode: err.errCode
    }
  }
}

// NLP 智能解析函数
function parseTaskFromVoice(text) {
  const result = {
    taskName: '',
    taskDescription: '',
    requireDate: '',
    executorName: '',
    priority: 'P1',
    category: '',
    isRecurring: false,
    recurringType: '',
    subTasks: []
  }
  
  // 清理文本
  text = text.replace(/\s+/g, ' ').trim()
  
  // 1. 解析时间
  const timeInfo = parseTime(text)
  if (timeInfo.date) {
    result.requireDate = timeInfo.date
    result.taskDescription += timeInfo.description + '。'
  }
  
  // 2. 解析执行人
  const executorMatch = text.match(/交给 | 给|让\s*(\w+)/)
  if (executorMatch) {
    result.executorName = executorMatch[1]
  }
  
  // 3. 解析优先级
  if (/紧急 | 急件 | 加急/.test(text)) {
    result.priority = 'P0'
  } else if (/重要 | 重点/.test(text)) {
    result.priority = 'P1'
  } else if (/一般 | 普通 | 日常/.test(text)) {
    result.priority = 'P2'
  }
  
  // 4. 解析重复任务
  if (/每天 | 每日/.test(text)) {
    result.isRecurring = true
    result.recurringType = 'daily'
  } else if (/每周 | 每星期/.test(text)) {
    result.isRecurring = true
    result.recurringType = 'weekly'
  } else if (/每月 | 每个月/.test(text)) {
    result.isRecurring = true
    result.recurringType = 'monthly'
  }
  
  // 5. 解析分类（公司名/部门名）
  const categoryMatch = text.match(/盛合智联 | 龙耀辉科技 | 华昇汽车 | 壹路同行 | 财务 | 人事 | 行政 | 技术 | 销售 | 市场/)
  if (categoryMatch) {
    result.category = categoryMatch[0]
  }
  
  // 6. 拆分任务名称和描述
  // 任务名称通常是第一个动作短语
  const actionKeywords = ['提交', '完成', '整理', '汇总', '准备', '准备', '联系', '安排', '处理', '跟进', '确认', '发送', '打印', '购买', '预定', '记得', '需要', '备注']
  
  let taskNameEnd = text.length
  for (const keyword of actionKeywords) {
    const index = text.indexOf(keyword)
    if (index > 0 && index < taskNameEnd) {
      taskNameEnd = index
    }
  }
  
  // 提取任务名称（前 20 个字左右）
  result.taskName = text.substring(0, taskNameEnd).trim()
  if (result.taskName.length > 30) {
    result.taskName = result.taskName.substring(0, 30)
  }
  
  // 提取任务描述（剩余部分）
  const descriptionStart = taskNameEnd
  if (descriptionStart < text.length) {
    let description = text.substring(descriptionStart).trim()
    
    // 清理描述中的时间、执行人等已解析信息
    description = description.replace(/今天 | 明天 | 后天 | 周 [一二三四五六日]|\d+ 点|\d+ 月\d+ 日/g, '')
    description = description.replace(/交给 | 给|让\s*\w+/g, '')
    description = description.replace(/紧急 | 重要 | 一般/g, '')
    description = description.replace(/每天 | 每周 | 每月/g, '')
    description = description.trim()
    
    if (description) {
      result.taskDescription += description
    }
  }
  
  // 如果任务名称为空，使用整段文本
  if (!result.taskName) {
    result.taskName = text.substring(0, 20)
  }
  
  // 7. 拆分子任务（按标点符号）
  const subTaskSplit = /[,.,,,,.]/
  const parts = text.split(subTaskSplit)
  if (parts.length > 1) {
    result.subTasks = parts
      .filter(p => p.trim().length > 3)
      .map(p => p.trim())
      .slice(0, 5) // 最多 5 个子任务
  }
  
  return result
}

// 时间解析函数
function parseTime(text) {
  const now = new Date()
  let date = null
  let description = ''
  
  // 1. 解析"今天"
  if (/今天 | 当日 | 当天/.test(text)) {
    date = formatDate(now)
    description = '今天'
  }
  
  // 2. 解析"明天"
  else if (/明天 | 次日/.test(text)) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    date = formatDate(tomorrow)
    description = '明天'
  }
  
  // 3. 解析"后天"
  else if (/后天/.test(text)) {
    const dayAfter = new Date(now)
    dayAfter.setDate(dayAfter.getDate() + 2)
    date = formatDate(dayAfter)
    description = '后天'
  }
  
  // 4. 解析"周 X"
  else if (/周 [一二三四五六日天]/.test(text)) {
    const weekMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }
    const weekMatch = text.match(/周 ([一二三四五六日天])/)
    if (weekMatch) {
      const targetWeek = weekMap[weekMatch[1]]
      const currentWeek = now.getDay()
      let daysToAdd = targetWeek - currentWeek
      if (daysToAdd <= 0) {
        daysToAdd += 7
      }
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + daysToAdd)
      date = formatDate(targetDate)
      description = `周${weekMatch[1]}`
    }
  }
  
  // 5. 解析"X 月 X 日"
  else if (/(\d+) 月 (\d+) 日/.test(text)) {
    const dateMatch = text.match(/(\d+) 月 (\d+) 日/)
    const month = parseInt(dateMatch[1]) - 1
    const day = parseInt(dateMatch[2])
    const year = now.getFullYear()
    const targetDate = new Date(year, month, day)
    date = formatDate(targetDate)
    description = `${month + 1}月${day}日`
  }
  
  // 6. 解析"X 点"（今天的时间）
  else if (/(\d+) 点/.test(text)) {
    const hourMatch = text.match(/(\d+) 点/)
    const hour = parseInt(hourMatch[1])
    const today = new Date(now)
    today.setHours(hour, 0, 0, 0)
    date = formatDate(today)
    description = `${hour}点`
  }
  
  // 7. 解析"下午 X 点"、"上午 X 点"
  else if (/下午 | 上午/.test(text)) {
    const timeMatch = text.match(/(上午 | 下午)(\d+) 点/)
    if (timeMatch) {
      const period = timeMatch[1]
      const hour = parseInt(timeMatch[2])
      let finalHour = hour
      if (period === '下午' && hour < 12) {
        finalHour += 12
      }
      const today = new Date(now)
      today.setHours(finalHour, 0, 0, 0)
      date = formatDate(today)
      description = `${period}${hour}点`
    }
  }
  
  // 8. 解析"X 天后"
  else if (/(\d+) 天后/.test(text)) {
    const daysMatch = text.match(/(\d+) 天后/)
    const days = parseInt(daysMatch[1])
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + days)
    date = formatDate(targetDate)
    description = `${days}天后`
  }
  
  return { date, description }
}

// 日期格式化
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
