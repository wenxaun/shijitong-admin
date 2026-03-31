// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { group_id, name } = event

  if (!group_id) {
    return {
      success: false,
      message: '分组ID不能为空',
      data: null
    }
  }

  if (!name || !name.trim()) {
    return {
      success: false,
      message: '分组名称不能为空',
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
        message: '无权限修改此分组',
        data: null
      }
    }

    // 更新分组名称
    await db.collection('task_groups')
      .doc(group_id)
      .update({
        data: {
          name: name.trim()
        }
      })

    // 同步更新任务中的分组名称
    await db.collection('tasks')
      .where({
        group_id: group_id
      })
      .update({
        data: {
          group_name: name.trim()
        }
      })

    return {
      success: true,
      message: '更新成功',
      data: null
    }
  } catch (err) {
    console.error('更新分组失败:', err)
    return {
      success: false,
      message: '更新失败',
      data: null
    }
  }
}
