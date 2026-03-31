// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { group_id } = event

  if (!group_id) {
    return {
      success: false,
      message: '分组ID不能为空',
      data: null
    }
  }

  try {
    // 验证分组属于当前用户
    const groupCheck = await db.collection('task_groups')
      .doc(group_id)
      .get()

    if (!groupCheck.data || groupCheck.data.user_id !== openid) {
      return {
        success: false,
        message: '无权限删除此分组',
        data: null
      }
    }

    // 删除分组
    await db.collection('task_groups')
      .doc(group_id)
      .remove()

    // 将该分组下的任务的 group_id 和 group_name 清空
    await db.collection('tasks')
      .where({
        group_id: group_id
      })
      .update({
        data: {
          group_id: _.remove(),
          group_name: _.remove()
        }
      })

    return {
      success: true,
      message: '删除成功',
      data: null
    }
  } catch (err) {
    console.error('删除分组失败:', err)
    return {
      success: false,
      message: '删除失败',
      data: null
    }
  }
}
