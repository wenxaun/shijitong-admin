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
  
  const {
    action,
    task_id,
    page = 1,
    pageSize = 20
  } = event

  try {
    // 关注任务
    if (action === 'follow') {
      if (!task_id) {
        return {
          success: false,
          message: '任务ID不能为空'
        }
      }
      
      // 检查是否已关注
      const existingFollow = await db.collection('task_follows')
        .where({
          task_id: task_id,
          user_id: OPENID
        })
        .count()
      
      if (existingFollow.total > 0) {
        return {
          success: false,
          message: '已关注该任务'
        }
      }
      
      // 获取用户信息
      const userResult = await db.collection('users')
        .where({ openid: OPENID })
        .field({ nickname: true })
        .limit(1)
        .get()
      
      const userName = (userResult.data[0] && userResult.data[0].nickname) || ''
      
      // 创建关注记录
      await db.collection('task_follows').add({
        data: {
          task_id: task_id,
          user_id: OPENID,
          user_name: userName,
          created_at: db.serverDate()
        }
      })
      
      // 创建日志
      await db.collection('task_logs').add({
        data: {
          task_id: task_id,
          action_type: 'follow',
          action_detail: JSON.stringify({ user_name: userName }),
          operator_id: OPENID,
          operator_name: userName,
          created_at: db.serverDate(),
          created_by: OPENID
        }
      })
      
      return {
        success: true,
        message: '关注成功'
      }
    }
    
    // 取消关注
    if (action === 'unfollow') {
      if (!task_id) {
        return {
          success: false,
          message: '任务ID不能为空'
        }
      }
      
      // 删除关注记录
      await db.collection('task_follows')
        .where({
          task_id: task_id,
          user_id: OPENID
        })
        .remove()
      
      // 创建日志
      const userResult = await db.collection('users')
        .where({ openid: OPENID })
        .field({ nickname: true })
        .limit(1)
        .get()
      
      const userName = (userResult.data[0] && userResult.data[0].nickname) || ''
      
      await db.collection('task_logs').add({
        data: {
          task_id: task_id,
          action_type: 'unfollow',
          action_detail: JSON.stringify({ user_name: userName }),
          operator_id: OPENID,
          operator_name: userName,
          created_at: db.serverDate(),
          created_by: OPENID
        }
      })
      
      return {
        success: true,
        message: '取消关注成功'
      }
    }
    
    // 检查是否已关注
    if (action === 'check') {
      if (!task_id) {
        return {
          success: false,
          message: '任务ID不能为空'
        }
      }
      
      const result = await db.collection('task_follows')
        .where({
          task_id: task_id,
          user_id: OPENID
        })
        .count()
      
      return {
        success: true,
        data: {
          is_followed: result.total > 0
        }
      }
    }
    
    // 获取关注列表
    if (action === 'list') {
      const result = await db.collection('task_follows')
        .where({ task_id: task_id })
        .orderBy('created_at', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      
      const countResult = await db.collection('task_follows')
        .where({ task_id: task_id })
        .count()
      
      return {
        success: true,
        data: {
          followers: result.data.map(f => ({
            _id: f._id,
            user_id: f.user_id,
            user_name: f.user_name,
            created_at: formatDateTime(f.created_at)
          })),
          total: countResult.total,
          hasMore: (page * pageSize) < countResult.total
        }
      }
    }
    
    return {
      success: false,
      message: '无效的操作类型'
    }
    
  } catch (err) {
    console.error('任务关注操作失败:', err)
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
