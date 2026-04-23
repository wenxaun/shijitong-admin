const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { openid } = event;
  const wxContext = cloud.getWXContext();

  if (!openid) {
    return {
      success: false,
      message: '缺少openid'
    };
  }

  try {
    // 1. 查询用户信息，确认是企业用户
    const userResult = await db.collection('user').where({
      openid: openid
    }).get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const user = userResult.data[0];

    // 如果不是企业用户，返回空数据
    if (user.user_type !== 'enterprise') {
      return {
        success: true,
        data: {
          enterprise: null,
          members: [],
          departments: []
        }
      };
    }

    // 2. 查询企业信息
    const enterpriseResult = await db.collection('enterprise').where({
      corp_id: user.corp_id
    }).get();

    let enterprise = null;
    if (enterpriseResult.data && enterpriseResult.data.length > 0) {
      enterprise = enterpriseResult.data[0];
    } else {
      // 如果企业信息不存在，创建基础信息
      const enterpriseData = {
        corp_id: user.corp_id,
        name: user.corp_name || '我的企业',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createResult = await db.collection('enterprise').add({
        data: enterpriseData
      });

      enterprise = {
        _id: createResult._id,
        ...enterpriseData
      };
    }

    // 3. 查询企业成员（user_type为enterprise且corp_id相同的用户）
    const membersResult = await db.collection('user').where({
      user_type: 'enterprise',
      corp_id: user.corp_id
    }).field({
      openid: true,
      nickname: true,
      avatar_url: true,
      department: true,
      role: true,
      created_at: true
    }).orderBy('created_at', 'desc').get();

    // 4. 查询部门信息
    const departmentsResult = await db.collection('department').where({
      corp_id: user.corp_id
    }).field({
      _id: true,
      name: true,
      parent_id: true,
      created_at: true
    }).orderBy('name', 'asc').get();

    // 5. 处理成员的部门名称
    const members = membersResult.data.map(member => {
      const dept = member.department;
      return {
        openid: member.openid,
        nickname: member.nickname || '未知',
        avatar_url: member.avatar_url || '',
        department_name: dept?.name || '',
        department_id: dept?.id || '',
        role: member.role || 'member'
      };
    });

    const departments = departmentsResult.data;

    return {
      success: true,
      data: {
        enterprise,
        members,
        departments
      }
    };

  } catch (error) {
    console.error('[EnterpriseInfo] Error:', error);
    return {
      success: false,
      message: '获取企业信息失败',
      error: error.message
    };
  }
};
