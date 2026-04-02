// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 操作类型
 * - create: 创建任务
 * - update: 更新任务
 * - delete: 删除任务
 * - complete: 完成任务
 * - cancel: 取消任务
 * - assign: 分配任务
 * - priority: 修改优先级
 * - status: 修改状态
 * - score: 评分
 * - exception: 异常上报
 * - follow: 关注任务
 * - unfollow: 取消关注
 */

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  
  const {
    action,
    task_id,
    logs, // 批量写入日志时使用
    page = 1,
    pageSize = 20,
    task_ids // 批量查询时使用
  } = event

  try {
    // 创建日志
    if (action === 'create') {
      const { task_id, action_type, action_detail, operator_id, operator_name } = event
      
      const log = {
        task_id,
        action_type,
        action_detail: action_detail || '',
        operator_id: operator_id || OPENID,
        operator_name: operator_name || '',
        created_at: db.serverDate(),
        created_by: OPENID
      }
      
      await db.collection('task_logs').add({
        data: log
      })
      
      return {
        success: true,
        message: '日志创建成功'
      }
    }
    
    // 批量创建日志
    if (action === 'batch_create') {
      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        return {
          success: false,
          message: '日志数据不能为空'
        }
      }
      
      const logsToAdd = logs.map(log => ({
        task_id: log.task_id,
        action_type: log.action_type,
        action_detail: log.action_detail || '',
        operator_id: log.operator_id || OPENID,
        operator_name: log.operator_name || '',
        created_at: db.serverDate(),
        created_by: OPENID
      }))
      
      await db.collection('task_logs').add({
        data: logsToAdd
      })
      
      return {
        success: true,
        message: '批量日志创建成功'
      }
    }
    
    // 查询单个任务的日志
    if (action === 'list') {
      const query = { task_id }
      
      const result = await db.collection('task_logs')
        .where(query)
        .orderBy('created_at', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      
      // 获取总数
      const countResult = await db.collection('task_logs').where(query).count()
      
      // 格式化日志
      const formattedLogs = result.data.map(log => ({
        _id: log._id,
        task_id: log.task_id,
        action_type: log.action_type,
        action_detail: log.action_detail,
        operator_id: log.operator_id,
        operator_name: log.operator_name,
        created_at: formatDateTime(log.created_at)
      }))
      
      return {
        success: true,
        data: {
          logs: formattedLogs,
          total: countResult.total,
          page,
          pageSize,
          hasMore: (page * pageSize) < countResult.total
        }
      }
    }
    
    // 批量查询多个任务的最新日志
    if (action === 'batch_list') {
      if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
        return {
          success: false,
          message: '任务ID不能为空'
        }
      }
      
      const result = await db.collection('task_logs')
        .where({
          task_id: _.in(task_ids)
        })
        .orderBy('created_at', 'desc')
        .limit(100) // 最多返回100条
        .get()
      
      // 按任务ID分组
      const logsByTask = {}
      result.data.forEach(log => {
        if (!logsByTask[log.task_id]) {
          logsByTask[log.task_id] = []
        }
        if (logsByTask[log.task_id].length < 5) { // 每个任务最多5条日志
          logsByTask[log.task_id].push({
            _id: log._id,
            action_type: log.action_type,
            action_detail: log.action_detail,
            operator_name: log.operator_name,
            created_at: formatDateTime(log.created_at)
          })
        }
      })
      
      return {
        success: true,
        data: logsByTask
      }
    }
    
    // 查询用户相关的所有日志（动态）
    if (action === 'timeline') {
      const { user_id, type = 'all' } = event
      
      let query = {}
      
      if (type === 'created') {
        // 我创建的任务的日志
        query = { operator_id: OPENID }
      } else if (type === 'executed') {
        // 我执行的任务的日志
        // 需要先查询我执行的任务ID
        const myTasks = await db.collection('tasks')
          .where({
            executor_id: OPENID
          })
          .field({ _id: true })
          .limit(100)
          .get()
        
        const taskIds = myTasks.data.map(t => t._id)
        query = { task_id: _.in(taskIds) }
      } else {
        // all: 我创建或我执行的任务的日志
        const myCreatedTasks = await db.collection('tasks')
          .where({
            publisher_id: OPENID
          })
          .field({ _id: true })
          .limit(100)
          .get()
        
        const myExecutedTasks = await db.collection('tasks')
          .where({
            executor_id: OPENID
          })
          .field({ _id: true })
          .limit(100)
          .get()
        
        const taskIds = [...new Set([
          ...myCreatedTasks.data.map(t => t._id),
          ...myExecutedTasks.data.map(t => t._id)
        ])]
        
        query = { task_id: _.in(taskIds) }
      }
      
      const result = await db.collection('task_logs')
        .where(query)
        .orderBy('created_at', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      
      // 获取总数
      const countResult = await db.collection('task_logs').where(query).count()
      
      // 获取任务名称
      const taskIds = [...new Set(result.data.map(log => log.task_id))]
      const tasksResult = await db.collection('tasks')
        .where({
          _id: _.in(taskIds)
        })
        .field({ _id: true, task_name: true })
        .get()
      
      const taskNames = {}
      tasksResult.data.forEach(task => {
        taskNames[task._id] = task.task_name
      })
      
      // 格式化日志
      const formattedLogs = result.data.map(log => ({
        _id: log._id,
        task_id: log.task_id,
        task_name: taskNames[log.task_id] || '未知任务',
        action_type: log.action_type,
        action_detail: log.action_detail,
        operator_id: log.operator_id,
        operator_name: log.operator_name,
        created_at: formatDateTime(log.created_at)
      }))
      
      return {
        success: true,
        data: {
          logs: formattedLogs,
          total: countResult.total,
          page,
          pageSize,
          hasMore: (page * pageSize) < countResult.total
        }
      }
    }
    
    return {
      success: false,
      message: '无效的操作类型'
    }
    
  } catch (err) {
    console.error('任务日志操作失败:', err)
    return {
      success: false,
      message: '操作失败：' + err.message,
      errCode: err.errCode
    }
  }
}

// 日期时间格式化辅助函数
function formatDateTime(date) {
  if (!date) return null
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}
