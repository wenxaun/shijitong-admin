// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { name } = event

  if (!name || !name.trim()) {
    return {
      success: false,
      message: '分组名称不能为空',
      data: null
    }
  }

  try {
    // 获取当前用户的分组数量
    const countResult = await db.collection('task_groups')
      .where({
        user_id: openid
      })
      .count()

    const order = countResult.total + 1

    // 创建新分组
    const result = await db.collection('task_groups').add({
      data: {
        name: name.trim(),
        user_id: openid,
        order: order,
        task_count: 0,
        created_at: db.serverDate()
      }
    })

    // 获取新创建的分组
    const newGroup = await db.collection('task_groups')
      .doc(result._id)
      .get()

    return {
      success: true,
      message: '创建成功',
      data: {
        group: newGroup.data
      }
    }
  } catch (err) {
    console.error('创建分组失败:', err)
    return {
      success: false,
      message: '创建失败',
      data: null
    }
  }
}
