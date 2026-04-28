const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production'

exports.main = async (event) => {
  const { username, password } = event

  try {
    // 查询管理员
    const { data: users } = await db.collection('users')
      .where({
        username,
        role: 'admin'
      })
      .get()

    if (users.length === 0) {
      return {
        code: 401,
        msg: '用户名或密码错误'
      }
    }

    const admin = users[0]

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return {
        code: 401,
        msg: '用户名或密码错误'
      }
    }

    // 生成JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return {
      code: 200,
      msg: 'success',
      data: {
        token,
        user: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          role: admin.role
        }
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      code: 500,
      msg: '登录失败: ' + error.message
    }
  }
}
