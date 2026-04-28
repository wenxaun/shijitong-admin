const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async function(event) {
  const openid = event.openid;
  const wxContext = cloud.getWXContext();

  if (!openid) {
    return {
      success: false,
      message: '缺少openid'
    };
  }

  try {
    var userResult = await db.collection('users').where({
      openid: openid
    }).get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    var user = userResult.data[0];

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

    var enterpriseResult = await db.collection('enterprises').where({
      corp_id: user.corp_id
    }).get();

    var enterprise = null;
    if (enterpriseResult.data && enterpriseResult.data.length > 0) {
      enterprise = enterpriseResult.data[0];
    } else {
      var enterpriseData = {
        corp_id: user.corp_id,
        name: user.corp_name || '我的企业',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      var createResult = await db.collection('enterprises').add({
        data: enterpriseData
      });

      enterprise = {
        _id: createResult._id,
        corp_id: enterpriseData.corp_id,
        name: enterpriseData.name,
        created_at: enterpriseData.created_at,
        updated_at: enterpriseData.updated_at
      };
    }

    var membersResult = await db.collection('users').where({
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

    var departmentsResult = await db.collection('departments').where({
      corp_id: user.corp_id
    }).field({
      _id: true,
      name: true,
      parent_id: true,
      created_at: true
    }).orderBy('name', 'asc').get();

    var members = membersResult.data.map(function(member) {
      var dept = member.department;
      var deptName = '';
      var deptId = '';
      if (dept) {
        deptName = dept.name || '';
        deptId = dept.id || '';
      }
      return {
        openid: member.openid,
        nickname: member.nickname || '未知',
        avatar_url: member.avatar_url || '',
        department_name: deptName,
        department_id: deptId,
        role: member.role || 'member'
      };
    });

    var departments = departmentsResult.data;

    return {
      success: true,
      data: {
        enterprise: enterprise,
        members: members,
        departments: departments
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
