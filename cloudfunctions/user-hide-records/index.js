// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const now = db.serverDate()
    
    // 标记用户创建的任务为对该用户隐藏
    // 使用 hidden_for_users 数组存储需要隐藏的用户 openid
    // 这样其他相关人员（执行人、协助人）仍然可以看到任务
    
    // 1. 隐藏用户创建的任务
    const createdTasksResult = await db.collection('tasks')
      .where({
        publisher_id: openid,
        hidden_for_users: _.nin([openid]) // 还未隐藏的
      })
      .update({
        data: {
          hidden_for_users: _.push(openid),
          hidden_at: now
        }
      })
    
    // 2. 隐藏用户执行的任务
    const executedTasksResult = await db.collection('tasks')
      .where({
        executor_id: openid,
        hidden_for_users: _.nin([openid])
      })
      .update({
        data: {
          hidden_for_users: _.push(openid),
          hidden_at: now
        }
      })
    
    // 3. 隐藏用户参与的子任务
    const subtasksResult = await db.collection('subtasks')
      .where({
        executor_id: openid,
        hidden_for_users: _.nin([openid])
      })
      .update({
        data: {
          hidden_for_users: _.push(openid),
          hidden_at: now
        }
      })

    return {
      success: true,
      message: '记录已隐藏',
      data: {
        hidden_created: (createdTasksResult.stats && createdTasksResult.stats.updated) || 0,
        hidden_executed: (executedTasksResult.stats && executedTasksResult.stats.updated) || 0,
        hidden_subtasks: (subtasksResult.stats && subtasksResult.stats.updated) || 0
      }
    }
  } catch (err) {
    console.error('隐藏记录失败:', err)
    return {
      success: false,
      message: '操作失败',
      data: null
    }
  }
}
