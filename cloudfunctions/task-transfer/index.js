const cloud = require('wx-server-sdk')
const { initCloud, validateAuth, responseWrapper, errorHandler } = require('../common/middleware')

// 并发控制：使用云数据库记录转交锁
const LOCK_COLLECTION = 'task_transfer_locks'
const LOCK_TIMEOUT = 30000 // 30秒超时

/**
 * 任务转交云函数
 * 功能：将任务转交给其他用户，记录流转历史
 * 并发控制：使用数据库锁防止重复转交
 */
exports.main = async (event, context) => {
  try {
    // 初始化云开发
    const { db, wxContext } = await initCloud()

    // 参数验证
    const { task_id, to_user_id, to_user_name, reason } = event

    if (!task_id || !to_user_id) {
      return responseWrapper({
        success: false,
        message: '参数不完整',
        code: 'MISSING_PARAMS'
      })
    }

    // 获取当前用户
    const { OPENID: from_user_id } = wxContext

    // 获取转交锁，防止并发
    const lockKey = `transfer_${task_id}_${from_user_id}`
    const lockCollection = db.collection(LOCK_COLLECTION)

    try {
      // 尝试获取锁
      const existingLock = await lockCollection.doc(lockKey).get()
      if (existingLock.data.length > 0) {
        const lock = existingLock.data[0]
        // 检查锁是否过期
        if (Date.now() - lock.created_at < LOCK_TIMEOUT) {
          return responseWrapper({
            success: false,
            message: '任务正在转交中，请稍后重试',
            code: 'LOCKED'
          })
        }
        // 锁已过期，删除
        await lockCollection.doc(lockKey).remove()
      }
    } catch (e) {
      // 锁不存在，继续执行
    }

    // 创建锁
    await lockCollection.add({
      data: {
        _id: lockKey,
        task_id,
        from_user_id,
        created_at: Date.now()
      }
    })

    try {
      // 查询任务
      const taskResult = await db.collection('tasks')
        .where({ task_id })
        .get()

      if (!taskResult.data || taskResult.data.length === 0) {
        return responseWrapper({
          success: false,
          message: '任务不存在',
          code: 'TASK_NOT_FOUND'
        })
      }

      const task = taskResult.data[0]

      // 权限验证：只有发布人或执行人可以转交
      if (task.publisher_id !== from_user_id && task.executor_id !== from_user_id) {
        return responseWrapper({
          success: false,
          message: '无权限转交此任务',
          code: 'NO_PERMISSION'
        })
      }

      // 不能转交给自己
      if (to_user_id === from_user_id) {
        return responseWrapper({
          success: false,
          message: '不能转交给自己',
          code: 'INVALID_TARGET'
        })
      }

      // 查询转交人和被转交人信息
      const fromUserResult = await db.collection('users')
        .where({ openid: from_user_id })
        .field({ nickname: true })
        .get()

      const toUserResult = await db.collection('users')
        .where({ openid: to_user_id })
        .field({ nickname: true })
        .get()

      const from_user_name = (fromUserResult.data[0] && fromUserResult.data[0].nickname) || '未知'
      const final_to_user_name = to_user_name || (toUserResult.data[0] && toUserResult.data[0].nickname) || '未知'

      // 使用事务更新任务
      const transaction = await db.startTransaction()

      try {
        // 更新任务执行人
        await transaction.collection('tasks').doc(task._id).update({
          data: {
            executor_id: to_user_id,
            executor_name: final_to_user_name,
            updated_at: new Date().toISOString()
          }
        })

        // 添加流转历史
        const flowHistory = task.flow_history || []
        flowHistory.push({
          from_executor: from_user_id,
          from_executor_name: from_user_name,
          to_executor: to_user_id,
          to_executor_name: final_to_user_name,
          reason: reason || '任务转交',
          note: reason || '',
          flow_date: new Date().toISOString()
        })

        await transaction.collection('tasks').doc(task._id).update({
          data: {
            flow_history
          }
        })

        // 记录任务操作日志
        await transaction.collection('task_logs').add({
          data: {
            task_id,
            action_type: 'assign',
            action_detail: `任务从 ${from_user_name} 转交给 ${final_to_user_name}${reason ? '，原因：' + reason : ''}`,
            operator_id: from_user_id,
            operator_name: from_user_name,
            created_at: new Date().toISOString()
          }
        })

        // 提交事务
        await transaction.commit()

        // 异步发送通知（不影响事务结果）
        sendTransferNotification({
          task,
          from_user_id,
          from_user_name,
          to_user_id,
          to_user_name: final_to_user_name,
          reason
        }).catch(err => {
          console.error('发送转交通知失败:', err)
        })

        // 删除锁
        await lockCollection.doc(lockKey).remove()

        return responseWrapper({
          success: true,
          message: '任务转交成功',
          data: {
            task_id,
            from_user_id,
            to_user_id,
            to_user_name: final_to_user_name
          }
        })

      } catch (transactionError) {
        // 事务失败，回滚
        await transaction.rollback()
        throw transactionError
      }

    } catch (error) {
      // 删除锁
      await lockCollection.doc(lockKey).remove()
      throw error
    }

  } catch (error) {
    console.error('任务转交失败:', error)
    return errorHandler(error)
  }
}

/**
 * 发送转交通知
 */
async function sendTransferNotification({ task, from_user_id, from_user_name, to_user_id, to_user_name, reason }) {
  const cloud = require('wx-server-sdk')
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

  // 调用统一推送接口
  await cloud.callFunction({
    name: 'push-notification',
    data: {
      to_user_id,
      message_type: 'task_transfer',
      message_data: {
        task_id: task.task_id,
        task_name: task.task_name,
        from_user_name,
        reason: reason || '任务转交'
      }
    }
  })
}
