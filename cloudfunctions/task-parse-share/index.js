// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 解析分享内容，提取任务信息
 * 使用关键词匹配和正则表达式进行基本解析
 */
function parseShareContent(content) {
  const result = {
    title: '',
    description: '',
    dueDate: getDefaultDueDate(),
    priority: 'P2',
    executor: '',
    confidence: 50
  }
  
  if (!content || typeof content !== 'string') {
    return result
  }
  
  // 提取标题：取第一句话或前20个字
  const lines = content.split(/[\n。！？]/).filter(line => line.trim())
  if (lines.length > 0) {
    const firstLine = lines[0].trim()
    result.title = firstLine.length > 20 ? firstLine.substring(0, 20) + '...' : firstLine
    result.confidence = 60
  }
  
  // 提取描述：剩余内容
  if (lines.length > 1) {
    result.description = lines.slice(1).join('\n').trim()
  }
  
  // 解析截止日期
  const datePatterns = [
    // 匹配 "明天"、"后天"
    { pattern: /明天|tomorrow/i, handler: () => addDays(1) },
    { pattern: /后天|day after tomorrow/i, handler: () => addDays(2) },
    // 匹配 "下周一" 到 "下周日"
    { pattern: /下(周|星期)(一|二|三|四|五|六|日|天)/, handler: (match) => getNextWeekday(match) },
    { pattern: /下周([一二三四五六日天])/, handler: (match) => getNextWeekday(match) },
    // 匹配 "本周一" 到 "本周日"
    { pattern: /本(周|星期)(一|二|三|四|五|六|日|天)/, handler: (match) => getThisWeekday(match) },
    // 匹配 "X月X日" 格式
    { pattern: /(\d{1,2})月(\d{1,2})[日号]/, handler: (match) => parseMonthDay(match) },
    // 匹配 "X号" 格式（本月）
    { pattern: /(\d{1,2})[号日]之前?/, handler: (match) => parseDayOfMonth(match) },
    // 匹配 "X天后"
    { pattern: /(\d+)天[以之]?后/, handler: (match) => addDays(parseInt(match[1])) },
    // 匹配 "周五之前"、"周三前"
    { pattern: /(周|星期)(一|二|三|四|五|六|日|天)[以之]?前/, handler: (match) => getWeekdayBefore(match) }
  ]
  
  for (const { pattern, handler } of datePatterns) {
    const match = content.match(pattern)
    if (match) {
      try {
        result.dueDate = handler(match)
        result.confidence = Math.min(result.confidence + 20, 90)
        break
      } catch (e) {
        console.error('解析日期失败:', e)
      }
    }
  }
  
  // 解析优先级
  if (/紧急|立即|马上|尽快|urgent|asap/i.test(content)) {
    result.priority = 'P0'
    result.confidence = Math.min(result.confidence + 10, 95)
  } else if (/重要|关键|核心|important|critical/i.test(content)) {
    result.priority = 'P1'
    result.confidence = Math.min(result.confidence + 5, 90)
  } else if (/有空|方便时|不急|whenever|free time/i.test(content)) {
    result.priority = 'P3'
  }
  
  return result
}

// 获取默认截止日期（7天后）
function getDefaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return formatDate(date)
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 添加天数
function addDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

// 解析 "X月X日" 格式
function parseMonthDay(match) {
  const month = parseInt(match[1])
  const day = parseInt(match[2])
  const now = new Date()
  let year = now.getFullYear()
  
  // 如果月份已过，则为明年
  if (month < now.getMonth() + 1) {
    year++
  }
  
  const date = new Date(year, month - 1, day)
  return formatDate(date)
}

// 解析 "X号" 格式（本月）
function parseDayOfMonth(match) {
  const day = parseInt(match[1])
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), day)
  
  // 如果日期已过，则为下个月
  if (date < now) {
    date.setMonth(date.getMonth() + 1)
  }
  
  return formatDate(date)
}

// 获取下周某天
function getNextWeekday(match) {
  const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }
  const targetDay = weekdayMap[match[1] || match[2]]
  
  const now = new Date()
  const currentDay = now.getDay()
  
  // 计算到下周目标日的天数
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) {
    daysUntil += 7
  }
  daysUntil += 7 // 确保是下周
  
  now.setDate(now.getDate() + daysUntil)
  return formatDate(now)
}

// 获取本周某天
function getThisWeekday(match) {
  const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }
  const targetDay = weekdayMap[match[1] || match[2]]
  
  const now = new Date()
  const currentDay = now.getDay()
  
  let daysUntil = targetDay - currentDay
  if (daysUntil < 0) {
    daysUntil += 7
  }
  
  now.setDate(now.getDate() + daysUntil)
  return formatDate(now)
}

// 获取某天之前（如果今天已过，则为下周）
function getWeekdayBefore(match) {
  const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 }
  const targetDay = weekdayMap[match[2]]
  
  const now = new Date()
  const currentDay = now.getDay()
  
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) {
    daysUntil += 7
  }
  
  now.setDate(now.getDate() + daysUntil)
  return formatDate(now)
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { content } = event
  
  console.log('[task-parse-share] 开始解析分享内容')
  console.log('[task-parse-share] 内容:', content)
  
  try {
    const parsed = parseShareContent(content)
    console.log('[task-parse-share] 解析结果:', JSON.stringify(parsed))
    
    return {
      success: true,
      data: {
        parsed
      }
    }
  } catch (err) {
    console.error('[task-parse-share] 解析失败:', err)
    return {
      success: false,
      message: '解析失败：' + err.message
    }
  }
}
