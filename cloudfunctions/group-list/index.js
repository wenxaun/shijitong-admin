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
    console.log('[group-list] 开始获取分组列表，openid:', openid)

    // 获取用户的分组列表
    const result = await db.collection('task_groups')
      .where({
        user_id: openid
      })
      .orderBy('order', 'asc')
      .get()

    console.log('[group-list] 查询成功，分组数量:', result.data.length)

    return {
      success: true,
      message: '获取成功',
      data: {
        groups: result.data || []
      }
    }
  } catch (err) {
    console.error('[group-list] 获取分组列表失败:', err)
    console.error('[group-list] 错误详情:', {
      message: err.message,
      code: err.errCode,
      errMsg: err.errMsg
    })

    // 容错处理：如果集合不存在，返回空数组而不是失败
    if (err.errCode === -1 || err.errMsg?.includes('collection not exists')) {
      console.warn('[group-list] task_groups 集合不存在，返回空数组')
      return {
        success: true,
        message: '获取成功（无分组）',
        data: {
          groups: []
        }
      }
    }

    return {
      success: false,
      message: '获取失败',
      data: null,
      error: {
        message: err.message,
        code: err.errCode
      }
    }
  }
}
