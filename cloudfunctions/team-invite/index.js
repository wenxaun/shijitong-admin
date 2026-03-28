// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成随机邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const { action, team_id, invite_code, user_id } = event
  
  console.log('[team-invite] action:', action, 'openid:', OPENID)
  
  try {
    // ==================== 创建邀请码 ====================
    if (action === 'create') {
      // 获取团队信息
      const teamRes = await db.collection('teams').doc(team_id).get()
      
      if (!teamRes.data) {
        return { success: false, message: '团队不存在' }
      }
      
      const team = teamRes.data
      
      // 权限检查：只有创建者或管理员可以生成邀请码
      const memberInfo = team.member_details?.find(m => m.openid === OPENID)
      const isLeader = team.leader_id === OPENID
      const canInvite = isLeader || memberInfo?.permissions?.can_invite_member || memberInfo?.role === 'admin'
      
      if (!canInvite) {
        return { success: false, message: '无权限生成邀请码' }
      }
      
      // 生成邀请码（有效期7天）
      const code = generateInviteCode()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      
      // 更新团队的邀请码
      await db.collection('teams').doc(team_id).update({
        data: {
          invite_code: code,
          invite_code_expires_at: expiresAt,
          updated_at: new Date()
        }
      })
      
      return {
        success: true,
        message: '邀请码生成成功',
        data: {
          invite_code: code,
          expires_at: expiresAt.toISOString()
        }
      }
    }
    
    // ==================== 查询邀请码 ====================
    if (action === 'query') {
      if (!invite_code) {
        return { success: false, message: '请输入邀请码' }
      }
      
      // 查找包含该邀请码的团队
      const teamRes = await db.collection('teams').where({
        invite_code: invite_code.toUpperCase()
      }).get()
      
      if (teamRes.data.length === 0) {
        return { success: false, message: '邀请码无效或已过期' }
      }
      
      const team = teamRes.data[0]
      
      // 检查邀请码是否过期
      if (team.invite_code_expires_at && new Date(team.invite_code_expires_at) < new Date()) {
        return { success: false, message: '邀请码已过期' }
      }
      
      // 获取邀请人信息（团队创建者或第一个管理员）
      const inviter = team.member_details?.find(m => m.role === 'owner') || 
                      team.member_details?.find(m => m.role === 'admin') ||
                      team.member_details?.[0]
      
      return {
        success: true,
        message: '查询成功',
        data: {
          team_id: team._id,
          team_name: team.name,
          team_description: team.description,
          inviter_name: inviter?.nickname || team.leader_name || '团队管理员',
          member_count: team.members?.length || team.member_details?.length || 0,
          expires_at: team.invite_code_expires_at
        }
      }
    }
    
    // ==================== 加入团队 ====================
    if (action === 'join') {
      if (!invite_code || !user_id) {
        return { success: false, message: '参数不完整' }
      }
      
      // 查找团队
      const teamRes = await db.collection('teams').where({
        invite_code: invite_code.toUpperCase()
      }).get()
      
      if (teamRes.data.length === 0) {
        return { success: false, message: '邀请码无效或已过期' }
      }
      
      const team = teamRes.data[0]
      
      // 检查邀请码是否过期
      if (team.invite_code_expires_at && new Date(team.invite_code_expires_at) < new Date()) {
        return { success: false, message: '邀请码已过期' }
      }
      
      // 检查是否已是成员
      const isMember = team.members?.includes(user_id) || 
                       team.member_details?.some(m => m.openid === user_id)
      
      if (isMember) {
        return { success: false, message: '你已是该团队成员' }
      }
      
      // 获取用户信息
      const userRes = await db.collection('users').where({
        openid: user_id
      }).get()
      
      const user = userRes.data?.[0]
      const nickname = user?.nickname || user?.username || '新成员'
      
      // 默认成员权限
      const defaultPermissions = {
        can_create_task: true,
        can_assign_task: false,
        can_view_all_tasks: false,
        can_edit_team: false,
        can_invite_member: false,
        can_remove_member: false
      }
      
      // 添加成员到团队
      const newMember = {
        openid: user_id,
        nickname: nickname,
        role: 'member',
        permissions: defaultPermissions,
        joined_at: new Date().toISOString()
      }
      
      await db.collection('teams').doc(team._id).update({
        data: {
          members: _.push(user_id),
          member_details: _.push(newMember),
          updated_at: new Date()
        }
      })
      
      return {
        success: true,
        message: '加入团队成功'
      }
    }
    
    // ==================== 未知操作 ====================
    return {
      success: false,
      message: '未知操作'
    }
    
  } catch (err) {
    console.error('[team-invite] 错误:', err)
    return {
      success: false,
      message: '操作失败：' + err.message
    }
  }
}
