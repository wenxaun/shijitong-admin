const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production'

// 验证token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

exports.main = async (event, context) => {
  const { action, token, ...params } = event

  // 验证管理员身份
  const decoded = verifyToken(token)
  if (!decoded || decoded.role !== 'admin') {
    return {
      code: 401,
      msg: '未授权'
    }
  }

  try {
    switch (action) {
      case 'list':
        // 获取用户列表
        const { search = '', userType = '', limit = 10, offset = 0 } = params
        let query = db.collection('users')

        if (search) {
          query = query.where({
            name: db.RegExp({
              regexp: search,
              options: 'i'
            })
          })
        }

        if (userType) {
          query = query.where({ user_type: userType })
        }

        const { data: list } = await query
          .orderBy('created_at', 'desc')
          .skip(offset)
          .limit(limit)
          .get()

        // 获取总数
        const countResult = await query.count()
        const total = countResult.total

        return {
          code: 200,
          msg: 'success',
          data: { list, total }
        }

      case 'delete':
        // 删除用户
        await db.collection('users')
          .doc(params.userId)
          .remove()

        return {
          code: 200,
          msg: 'success',
          data: { success: true }
        }

      default:
        return {
          code: 400,
          msg: '未知操作'
        }
    }
  } catch (error) {
    console.error('操作失败:', error)
    return {
      code: 500,
      msg: '操作失败: ' + error.message
    }
  }
}
