const cloud = require('wx-server-sdk')
const { initCloud, validateAuth, responseWrapper, errorHandler } = require('../common/middleware')

/**
 * 任务审核云函数
 * 功能：上级或发布人审核任务完成情况
 * 支持：通过、拒绝、补充材料等操作
 */
exports.main = async (event, context) => {
  try {
    // 初始化云开发
    const { db, wxContext } = await initCloud()

    // 参数验证
    const { task_id, action, comment } = event

    if (!task_id || !action) {
      return responseWrapper({
        success: false,
        message: '参数不完整',
        code: 'MISSING_PARAMS'
      })
    }

    // 验证 action 类型
    const validActions = ['approve', 'reject', 'request_info']
    if (!validActions.includes(action)) {
      return responseWrapper({
        success: false,
        message: '无效的审核操作',
        code: 'INVALID_ACTION'
      })
    }

    // 获取当前用户（审核人）
    const { OPENID: reviewer_id } = wxContext

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

    // 权限验证：审核人必须是发布人或reviewer_id
    const isReviewer = task.reviewer_id === reviewer_id
    const isPublisher = task.publisher_id === reviewer_id

    if (!isReviewer && !isPublisher) {
      return responseWrapper({
        success: false,
        message: '无权限审核此任务',
        code: 'NO_PERMISSION'
      })
    }

    // 查询审核人信息
    const reviewerResult = await db.collection('users')
      .where({ openid: reviewer_id })
      .field({ nickname: true })
      .get()

    const reviewer_name = reviewerResult.data[0]?.nickname || '未知'

    // 使用事务更新任务
    const transaction = await db.startTransaction()

    try {
      // 根据审核操作更新任务状态
      let newStatus = task.status
      let actionDetail = ''

      if (action === 'approve') {
        // 通过审核，任务完成
        newStatus = 'completed'
        actionDetail = `审核通过，任务已完成。${comment ? '审核意见：' + comment : ''}`

        // 更新完成时间
        await transaction.collection('tasks').doc(task._id).update({
          data: {
            status: newStatus,
            complete_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
      } else if (action === 'reject') {
        // 拒绝审核，任务退回到进行中
        newStatus = 'in_progress'
        actionDetail = `审核未通过，任务退回。${comment ? '原因：' + comment : ''}`

        await transaction.collection('tasks').doc(task._id).update({
          data: {
            status: newStatus,
            updated_at: new Date().toISOString()
          }
        })
      } else if (action === 'request_info') {
        // 请求补充材料，任务状态不变
        actionDetail = `请求补充材料。${comment ? '要求：' + comment : ''}`

        await transaction.collection('tasks').doc(task._id).update({
          data: {
            updated_at: new Date().toISOString()
          }
        })
      }

      // 添加审核记录
      const reviewHistory = task.review_history || []
      reviewHistory.push({
        reviewer_id,
        reviewer_name,
        action,
        comment: comment || '',
        reviewed_at: new Date().toISOString()
      })

      await transaction.collection('tasks').doc(task._id).update({
        data: {
          review_history,
          reviewed_at: new Date().toISOString(), // 最后审核时间
          reviewed_by: reviewer_id, // 最后审核人
          reviewed_by_name: reviewer_name
        }
      })

      // 记录任务操作日志
      await transaction.collection('task_logs').add({
        data: {
          task_id,
          action_type: 'score', // 使用 score 类型表示审核操作
          action_detail: actionDetail,
          operator_id: reviewer_id,
          operator_name: reviewer_name,
          created_at: new Date().toISOString()
        }
      })

      // 提交事务
      await transaction.commit()

      // 异步发送通知
      sendReviewNotification({
        task,
        reviewer_id,
        reviewer_name,
        action,
        comment
      }).catch(err => {
        console.error('发送审核通知失败:', err)
      })

      return responseWrapper({
        success: true,
        message: getSuccessMessage(action),
        data: {
          task_id,
          action,
          new_status: newStatus,
          reviewer_id,
          reviewer_name
        }
      })

    } catch (transactionError) {
      // 事务失败，回滚
      await transaction.rollback()
      throw transactionError
    }

  } catch (error) {
    console.error('任务审核失败:', error)
    return errorHandler(error)
  }
}

/**
 * 获取成功消息
 */
function getSuccessMessage(action) {
  const messages = {
    approve: '审核通过，任务已完成',
    reject: '已拒绝审核，任务已退回',
    request_info: '已发送补充材料请求'
  }
  return messages[action] || '审核操作成功'
}

/**
 * 发送审核通知
 */
async function sendReviewNotification({ task, reviewer_id, reviewer_name, action, comment }) {
  const cloud = require('wx-server-sdk')
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

  // 通知执行人（除非执行人自己审核）
  if (task.executor_id !== reviewer_id) {
    await cloud.callFunction({
      name: 'push-notification',
      data: {
        to_user_id: task.executor_id,
        message_type: 'task_review',
        message_data: {
          task_id: task.task_id,
          task_name: task.task_name,
          action,
          reviewer_name,
          comment: comment || ''
        }
      }
    })
  }

  // 如果是执行人提交审核，通知发布人
  if (task.publisher_id !== reviewer_id) {
    await cloud.callFunction({
      name: 'push-notification',
      data: {
        to_user_id: task.publisher_id,
        message_type: 'task_review_publisher',
        message_data: {
          task_id: task.task_id,
          task_name: task.task_name,
          action,
          reviewer_name,
          comment: comment || ''
        }
      }
    })
  }
}
