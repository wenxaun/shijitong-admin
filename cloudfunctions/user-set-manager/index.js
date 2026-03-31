// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 设置直属上级
 * 
 * 入参：
 * - manager_openid: 上级的 openid，传空字符串表示清除上级
 * 
 * 说明：
 * - 汇报关系独立于团队功能，不影响团队内的角色和权限
 * - 设置上级后，日报/周报会抄送给上级
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { manager_openid } = event
  
  console.log('[user-set-manager] 开始执行')
  console.log('[user-set-manager] OPENID:', OPENID)
  console.log('[user-set-manager] manager_openid:', manager_openid)
  
  try {
    // 获取当前用户信息
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()
    
    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    const currentUser = userRes.data[0]
    
    // 清除上级
    if (!manager_openid || manager_openid === '') {
      await db.collection('users').doc(currentUser._id).update({
        data: {
          manager_id: db.command.remove(),
          manager_name: db.command.remove(),
          report_to: [],
          updated_at: new Date()
        }
      })
      
      console.log('[user-set-manager] 已清除上级')
      
      return {
        success: true,
        message: '已清除直属上级',
        data: {
          manager_id: null,
          manager_name: null
        }
      }
    }
    
    // 不能把自己设为上级
    if (manager_openid === OPENID) {
      return {
        success: false,
        message: '不能将自己设为上级'
      }
    }
    
    // 获取上级用户信息
    const managerRes = await db.collection('users').where({
      openid: manager_openid
    }).get()
    
    if (managerRes.data.length === 0) {
      return {
        success: false,
        message: '上级用户不存在'
      }
    }
    
    const manager = managerRes.data[0]
    
    // 检查是否形成循环汇报（上级的上级不能是当前用户）
    if (manager.manager_id === OPENID) {
      return {
        success: false,
        message: '不能形成循环汇报关系'
      }
    }
    
    // 更新当前用户的上级信息
    await db.collection('users').doc(currentUser._id).update({
      data: {
        manager_id: manager_openid,
        manager_name: manager.nickname,
        report_to: [manager_openid],  // 汇报对象列表，默认包含直属上级
        updated_at: new Date()
      }
    })
    
    console.log('[user-set-manager] 设置上级成功:', manager.nickname)
    
    return {
      success: true,
      message: '设置成功',
      data: {
        manager_id: manager_openid,
        manager_name: manager.nickname,
        manager_avatar: manager.avatar_url
      }
    }
    
  } catch (err) {
    console.error('[user-set-manager] 设置上级失败:', err)
    return {
      success: false,
      message: '设置失败：' + err.message,
      errCode: err.errCode
    }
  }
}
