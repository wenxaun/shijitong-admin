const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production'

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

exports.main = async (event, context) => {
  const { action, token, config } = event

  const decoded = verifyToken(token)
  if (!decoded || decoded.role !== 'admin') {
    return {
      code: 401,
      msg: '未授权'
    }
  }

  try {
    switch (action) {
      case 'get':
        // 获取当前配置
        const { data: currentConfig } = await db.collection('configs')
          .orderBy('updated_at', 'desc')
          .limit(1)
          .get()

        return {
          code: 200,
          msg: 'success',
          data: currentConfig[0] || {}
        }

      case 'update':
        // 更新配置
        await db.collection('configs')
          .add({
            ...config,
            updated_at: new Date(),
            updated_by: decoded.username
          })

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
