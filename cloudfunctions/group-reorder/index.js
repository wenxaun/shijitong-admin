// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { orders } = event // [{ id: 'group_id', order: 1 }, ...]

  if (!orders || !Array.isArray(orders)) {
    return {
      success: false,
      message: '参数错误',
      data: null
    }
  }

  try {
    // 批量更新排序
    const promises = orders.map(item => {
      return db.collection('task_groups')
        .doc(item.id)
        .update({
          data: {
            order: item.order
          }
        })
    })

    await Promise.all(promises)

    return {
      success: true,
      message: '排序更新成功',
      data: null
    }
  } catch (err) {
    console.error('更新排序失败:', err)
    return {
      success: false,
      message: '更新失败',
      data: null
    }
  }
}
