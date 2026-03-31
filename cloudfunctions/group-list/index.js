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
    // 获取用户的分组列表
    const result = await db.collection('task_groups')
      .where({
        user_id: openid
      })
      .orderBy('order', 'asc')
      .get()

    return {
      success: true,
      message: '获取成功',
      data: {
        groups: result.data
      }
    }
  } catch (err) {
    console.error('获取分组列表失败:', err)
    return {
      success: false,
      message: '获取失败',
      data: null
    }
  }
}
