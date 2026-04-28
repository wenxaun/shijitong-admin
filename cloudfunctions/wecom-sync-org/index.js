/**
 * 企业微信组织架构增量同步
 * 通过微信云开发云调用安全地访问企业微信 API
 * 采用增量同步策略，避免全量覆盖导致大量写操作
 */

const cloud = require('wx-server-sdk')

// 尝试加载公共中间件，如果失败则使用简化版本
let middleware
try {
  middleware = require('../common/middleware')
} catch (err) {
  console.warn('[wecom-sync-org] 无法加载 ../common/middleware，使用内置实现')
  middleware = {
    logRequest: (functionName, event) => {
      console.log(`===== ${functionName} 开始执行 =====`)
      console.log(`[${functionName}] 请求参数:`, JSON.stringify(event, null, 2))
    },
    logResponse: (functionName, result) => {
      console.log(`[${functionName}] 响应结果:`, JSON.stringify(result, null, 2))
      console.log(`===== ${functionName} 执行结束 =====`)
    },
    success: (message, data) => ({
      success: true,
      message,
      data
    }),
    error: (message, errCode = null) => ({
      success: false,
      message,
      errCode
    }),
    errorHandler: (err, prefix = '操作失败') => {
      console.error(`[${prefix}]`, err)
      return {
        success: false,
        message: `${prefix}：${err.message}`,
        errCode: err.errCode
      }
    },
    batchInsert: async (collectionName, documents) => {
      if (!documents || documents.length === 0) return
      const db = cloud.database()
      await Promise.all(documents.map(doc =>
        db.collection(collectionName).add({ data: doc })
      ))
    },
    COLLECTIONS: {
      USERS: 'users',
      TASKS: 'tasks',
      TASK_LOGS: 'task_logs',
      TASK_GROUPS: 'task_groups',
      ORGANIZATIONS: 'organizations',
      DEPARTMENTS: 'departments',
      NOTIFICATIONS: 'notifications'
    }
  }
}

const {
  logRequest,
  logResponse,
  success,
  error,
  errorHandler,
  batchInsert,
  COLLECTIONS
} = middleware

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 同步部门列表（增量更新）
 */
async function syncDepartments(corpId) {
  try {
    console.log('[syncDepartments] 开始同步部门')

    // 获取企业微信部门列表（云调用）
    const deptList = await cloud.openapi.qywx.getDepartmentList({
      id: 1 // 从根部门开始
    })

    if (!deptList.department || deptList.department.length === 0) {
      console.log('[syncDepartments] 没有部门数据')
      return { success: true, count: 0 }
    }

    const syncTime = new Date().toISOString()
    let updateCount = 0

    // 批量获取已存在的部门
    const existingDepts = await db.collection(COLLECTIONS.DEPARTMENTS)
      .where({ corp_id: corpId })
      .get()

    const existingDeptMap = new Map()
    existingDepts.data.forEach(dept => {
      existingDeptMap.set(dept.dept_id.toString(), dept)
    })

    const departmentsToUpdate = []
    const departmentsToCreate = []

    // 增量更新：只更新变化的部门
    for (const dept of deptList.department) {
      const deptId = dept.id.toString()
      const existing = existingDeptMap.get(deptId)

      const deptData = {
        corp_id: corpId,
        dept_id: deptId,
        name: dept.name,
        name_en: dept.name_en || '',
        parent_id: dept.parentid ? dept.parentid.toString() : '0',
        sort: dept.order || 0,
        sync_time: syncTime,
        updated_at: new Date()
      }

      if (existing) {
        // 检查是否需要更新
        const needsUpdate =
          existing.name !== dept.name ||
          existing.parent_id !== deptData.parent_id ||
          existing.sort !== deptData.sort

        if (needsUpdate) {
          await db.collection(COLLECTIONS.DEPARTMENTS)
            .doc(existing._id)
            .update({ data: deptData })
          updateCount++
        }
      } else {
        deptData.created_at = new Date()
        departmentsToCreate.push(deptData)
      }
    }

    // 批量创建新部门
    if (departmentsToCreate.length > 0) {
      await batchInsert(COLLECTIONS.DEPARTMENTS, departmentsToCreate)
      updateCount += departmentsToCreate.length
    }

    console.log(`[syncDepartments] 同步完成，更新 ${updateCount} 个部门`)
    return { success: true, count: updateCount }

  } catch (err) {
    console.error('[syncDepartments] 同步失败:', err)
    throw err
  }
}

/**
 * 同步成员列表（增量更新）
 */
async function syncMembers(corpId) {
  try {
    console.log('[syncMembers] 开始同步成员')

    // 获取部门列表
    const deptList = await db.collection(COLLECTIONS.DEPARTMENTS)
      .where({ corp_id: corpId })
      .get()

    if (deptList.data.length === 0) {
      console.log('[syncMembers] 没有部门数据，跳过成员同步')
      return { success: true, count: 0 }
    }

    const syncTime = new Date().toISOString()
    let totalUpdateCount = 0

    // 按部门获取成员列表
    for (const dept of deptList.data) {
      // 获取该部门的成员（云调用）
      const memberList = await cloud.openapi.qywx.getDepartmentUserList({
        department_id: dept.dept_id,
        fetch_child: 0 // 不获取子部门成员
      })

      if (!memberList.userlist || memberList.userlist.length === 0) {
        continue
      }

      // 获取已存在的用户
      const existingUsers = await db.collection(COLLECTIONS.USERS)
        .where({
          corp_id: corpId,
          user_type: 'enterprise'
        })
        .get()

      const existingUserMap = new Map()
      existingUsers.data.forEach(user => {
        existingUserMap.set(user.userid, user)
      })

      const usersToUpdate = []
      const usersToCreate = []

      // 增量更新：只更新变化的成员
      for (const member of memberList.userlist) {
        const existing = existingUserMap.get(member.userid)

        const userData = {
          corp_id: corpId,
          userid: member.userid,
          name: member.name,
          name_en: member.english_name || '',
          mobile: member.mobile || '',
          email: member.email || '',
          avatar: member.avatar || '',
          department: {
            id: dept.dept_id,
            name: dept.name
          },
          position: member.position || '',
          gender: member.gender || 1,
          is_leader: member.isleader || 0,
          status: member.status || 1,
          enable: member.enable || 1,
          sync_time: syncTime,
          updated_at: new Date()
        }

        if (existing) {
          // 检查是否需要更新
          const needsUpdate =
            existing.name !== member.name ||
            existing.mobile !== member.mobile ||
            existing.department?.id !== dept.dept_id ||
            existing.position !== member.position

          if (needsUpdate) {
            await db.collection(COLLECTIONS.USERS)
              .doc(existing._id)
              .update({ data: userData })
            totalUpdateCount++
          }
        } else {
          userData.created_at = new Date()
          usersToCreate.push(userData)
        }
      }

      // 批量创建新用户
      if (usersToCreate.length > 0) {
        await batchInsert(COLLECTIONS.USERS, usersToCreate)
        totalUpdateCount += usersToCreate.length
      }
    }

    console.log(`[syncMembers] 同步完成，更新 ${totalUpdateCount} 个成员`)
    return { success: true, count: totalUpdateCount }

  } catch (err) {
    console.error('[syncMembers] 同步失败:', err)
    throw err
  }
}

/**
 * 记录同步日志
 */
async function logSync(corpId, deptCount, memberCount) {
  await db.collection('sync_logs').add({
    data: {
      corp_id: corpId,
      type: 'org_sync',
      dept_count: deptCount,
      member_count: memberCount,
      sync_time: new Date(),
      created_at: new Date()
    }
  })
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  logRequest('wecom-sync-org', event)

  const { corp_id } = event
  const wxContext = cloud.getWXContext()

  // 验证参数
  if (!corp_id) {
    return error('缺少企业ID')
  }

  try {
    // 1. 同步部门（增量）
    const deptResult = await syncDepartments(corp_id)
    if (!deptResult.success) {
      return error('部门同步失败')
    }

    // 2. 同步成员（增量）
    const memberResult = await syncMembers(corp_id)
    if (!memberResult.success) {
      return error('成员同步失败')
    }

    // 3. 记录同步日志
    await logSync(corp_id, deptResult.count, memberResult.count)

    const result = success('同步成功', {
      dept_count: deptResult.count,
      member_count: memberResult.count,
      sync_time: new Date().toISOString()
    })

    logResponse('wecom-sync-org', result)
    return result

  } catch (err) {
    const errorResult = errorHandler(err, '组织架构同步')
    logResponse('wecom-sync-org', errorResult)
    return errorResult
  }
}
