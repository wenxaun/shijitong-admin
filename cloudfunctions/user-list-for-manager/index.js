// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 获取可设置上级的用户列表
 * 
 * 入参：
 * - keyword: 搜索关键词（可选）
 * - page: 页码
 * - pageSize: 每页数量
 * 
 * 说明：
 * - 返回除自己外的所有用户
 * - 支持按昵称搜索
 * - 用于"设置上级"功能的选择列表
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { keyword, page = 1, pageSize = 20 } = event
  
  console.log('[user-list-for-manager] 开始执行')
  console.log('[user-list-for-manager] OPENID:', OPENID)
  console.log('[user-list-for-manager] keyword:', keyword)
  
  try {
    // 构建查询条件
    let query = {
      openid: _.neq(OPENID)  // 排除自己
    }
    
    // 关键词搜索
    if (keyword && keyword.trim()) {
      query = {
        openid: _.neq(OPENID),
        nickname: db.RegExp({
          regexp: keyword.trim(),
          options: 'i'
        })
      }
    }
    
    // 查询用户列表
    const skip = (page - 1) * pageSize
    const usersRes = await db.collection('users')
      .where(query)
      .field({
        _id: true,
        openid: true,
        nickname: true,
        avatar_url: true,
        manager_id: true,
        manager_name: true
      })
      .orderBy('last_login', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const countRes = await db.collection('users').where(query).count()
    
    const users = usersRes.data.map(user => ({
      openid: user.openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url || '',
      manager_name: user.manager_name || ''
    }))
    
    console.log('[user-list-for-manager] 查询到用户数:', users.length)
    
    return {
      success: true,
      data: {
        users: users,
        total: countRes.total,
        hasMore: skip + users.length < countRes.total
      }
    }
    
  } catch (err) {
    console.error('[user-list-for-manager] 查询失败:', err)
    return {
      success: false,
      message: '查询失败：' + err.message,
      errCode: err.errCode
    }
  }
}
