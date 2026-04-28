/**
 * 云函数公共中间件
 * 提供统一的初始化、鉴权、错误处理、响应格式化等功能
 */

const cloud = require('wx-server-sdk')

// 初始化云开发（单例模式）
let db = null
const getDB = () => {
  if (!db) {
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
    db = cloud.database()
  }
  return db
}

/**
 * 获取用户 OPENID
 * @returns {string} OPENID
 */
const getOpenId = () => {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID
}

/**
 * 验证用户会话
 * @param {string} openid - 用户 OPENID
 * @returns {Promise<Object|null>} 用户信息或 null
 */
const validateSession = async (openid) => {
  try {
    const db = getDB()
    const userRes = await db.collection('users').where({
      openid: openid
    }).limit(1).get()

    if (userRes.data.length === 0) {
      return null
    }

    return userRes.data[0]
  } catch (err) {
    console.error('[middleware] validateSession 错误:', err)
    return null
  }
}

/**
 * 检查管理员权限
 * @param {Object} user - 用户信息
 * @returns {boolean} 是否有管理员权限
 */
const isAdmin = (user) => {
  if (!user) return false
  return user.role === 'admin' || user.role === 'owner'
}

/**
 * 统一响应格式
 * @param {boolean} success - 是否成功
 * @param {string} message - 消息
 * @param {*} data - 数据
 * @returns {Object} 响应对象
 */
const responseWrapper = (success, message, data = null, errCode = null) => {
  const response = {
    success,
    message,
    data
  }
  if (errCode) {
    response.errCode = errCode
  }
  return response
}

/**
 * 成功响应
 */
const success = (message, data) => {
  return responseWrapper(true, message, data)
}

/**
 * 失败响应
 */
const error = (message, errCode = null) => {
  return responseWrapper(false, message, null, errCode)
}

/**
 * 错误处理器
 * @param {Error} err - 错误对象
 * @param {string} prefix - 错误前缀
 * @returns {Object} 错误响应
 */
const errorHandler = (err, prefix = '操作失败') => {
  console.error(`[${prefix}]`, err)
  return error(`${prefix}：${err.message}`, err.errCode)
}

/**
 * 请求日志
 * @param {string} functionName - 函数名
 * @param {Object} event - 事件参数
 */
const logRequest = (functionName, event) => {
  console.log(`===== ${functionName} 开始执行 =====`)
  console.log(`[${functionName}] 请求参数:`, JSON.stringify(event, null, 2))
}

/**
 * 响应日志
 * @param {string} functionName - 函数名
 * @param {Object} result - 响应结果
 */
const logResponse = (functionName, result) => {
  console.log(`[${functionName}] 响应结果:`, JSON.stringify(result, null, 2))
  console.log(`===== ${functionName} 执行结束 =====`)
}

/**
 * 参数验证
 * @param {Object} event - 事件参数
 * @param {Array<string>} requiredFields - 必填字段
 * @returns {Object|null} 验证结果或 null
 */
const validateParams = (event, requiredFields) => {
  for (const field of requiredFields) {
    if (!event[field]) {
      return {
        valid: false,
        message: `缺少必填参数: ${field}`
      }
    }
  }
  return { valid: true }
}

/**
 * 集合名称常量
 */
const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  TASK_LOGS: 'task_logs',
  TASK_GROUPS: 'task_groups',
  ORGANIZATIONS: 'organizations',
  DEPARTMENTS: 'departments',
  NOTIFICATIONS: 'notifications'
}

/**
 * 批量插入辅助函数
 * @param {string} collectionName - 集合名称
 * @param {Array<Object>} documents - 文档数组
 * @returns {Promise<void>}
 */
const batchInsert = async (collectionName, documents) => {
  if (documents.length === 0) return

  const db = getDB()
  await Promise.all(documents.map(doc =>
    db.collection(collectionName).add({ data: doc })
  ))
}

/**
 * 企业微信云调用封装
 * 安全地使用 corpSecret，避免明文存储
 */
const wecomAPI = {
  /**
   * 获取企业微信 Access Token（通过云调用自动管理）
   * @returns {Promise<string>}
   */
  async getAccessToken() {
    try {
      // 使用微信云开发的云调用功能，自动管理 access_token
      // 不需要手动存储和刷新
      return await cloud.openapi.qywx.getAccessToken()
    } catch (err) {
      console.error('[wecomAPI] getAccessToken 失败:', err)
      throw err
    }
  },

  /**
   * 发送企业微信应用消息
   * @param {Object} params - 消息参数
   * @returns {Promise<void>}
   */
  async sendMessage(params) {
    try {
      await cloud.openapi.qywx.sendMessage(params)
    } catch (err) {
      console.error('[wecomAPI] sendMessage 失败:', err)
      throw err
    }
  },

  /**
   * 获取企业微信用户信息
   * @param {string} userid - 企业微信用户ID
   * @returns {Promise<Object>}
   */
  async getUser(userid) {
    try {
      return await cloud.openapi.qywx.getUser({ userid })
    } catch (err) {
      console.error('[wecomAPI] getUser 失败:', err)
      throw err
    }
  }
}

module.exports = {
  getDB,
  getOpenId,
  validateSession,
  isAdmin,
  responseWrapper,
  success,
  error,
  errorHandler,
  logRequest,
  logResponse,
  validateParams,
  COLLECTIONS,
  batchInsert,
  wecomAPI
}
