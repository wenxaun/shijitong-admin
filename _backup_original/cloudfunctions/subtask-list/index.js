// 云函数入口文件 - 获取子任务列表
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
  
  try {
    const {
      parent_task_id,
      page = 1,
      page_size = 20
    } = event
    
    if (!parent_task_id) {
      return {
        success: false,
        message: '主任务 ID 为必填项'
      }
    }
    
    // 验证主任务存在
    const parentTaskRes = await db.collection('tasks').doc(parent_task_id).get()
    if (!parentTaskRes.data) {
      return {
        success: false,
        message: '主任务不存在'
      }
    }
    
    // 查询子任务
    const skip = (page - 1) * page_size
    const subtasksRes = await db.collection('tasks')
      .where({
        parent_task_id: parent_task_id,
        is_subtask: true
      })
      .orderBy('created_at', 'asc')
      .skip(skip)
      .limit(page_size)
      .get()
    
    // 查询子任务总数
    const countRes = await db.collection('tasks')
      .where({
        parent_task_id: parent_task_id,
        is_subtask: true
      })
      .count()
    
    // 统计完成情况
    const completedCount = subtasksRes.data.filter(t => t.status === 'completed').length
    
    // 获取用户信息（执行人的名称）
    const executorIds = [...new Set(subtasksRes.data.map(t => t.executor_id))]
    const usersMap = {}
    
    if (executorIds.length > 0) {
      const usersRes = await db.collection('users')
        .where({
          openid: _.in(executorIds)
        })
        .field({
          openid: true,
          nickname: true,
          avatar_url: true
        })
        .get()
      
      usersRes.data.forEach(u => {
        usersMap[u.openid] = {
          name: u.nickname,
          avatar_url: u.avatar_url || ''
        }
      })
    }
    
    // 格式化子任务数据
    const subtasks = subtasksRes.data.map(task => {
      const executorInfo = usersMap[task.executor_id] || { name: '未知', avatar_url: '' }
      return {
        ...task,
        subtask_id: task._id,
        executor_name: executorInfo.name,
        executor_avatar: executorInfo.avatar_url,
        is_completed: task.status === 'completed'
      }
    })
    
    return {
      success: true,
      data: {
        subtasks,
        total: countRes.total,
        completed_count: completedCount,
        progress: countRes.total > 0 ? Math.round((completedCount / countRes.total) * 100) : 0,
        page,
        page_size
      }
    }
    
  } catch (err) {
    console.error('获取子任务列表失败:', err)
    return {
      success: false,
      message: '获取子任务列表失败：' + err.message,
      errCode: err.errCode
    }
  }
}
