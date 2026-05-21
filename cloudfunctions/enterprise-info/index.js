const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 从配置记录获取企业微信配置
 */
async function getWecomConfig() {
  try {
    const configRes = await db.collection('config_records')
      .where({
        category: 'wecom'
      })
      .get();

    if (!configRes.data || configRes.data.length === 0) {
      return null;
    }

    const wecomConfig = {};
    configRes.data.forEach(record => {
      const key = record.key.replace('wecom.', '');
      wecomConfig[key] = record.value;
    });

    console.log('[getWecomConfig] 配置:', wecomConfig);
    return wecomConfig;
  } catch (err) {
    console.error('[getWecomConfig] 获取配置失败:', err);
    return null;
  }
}

exports.main = async function(event) {
  const openid = event.openid;
  const wxContext = cloud.getWXContext();

  console.log('[enterprise-info] 开始执行, openid:', openid);
  console.log('[enterprise-info] wxContext:', {
    OPENID: wxContext.OPENID,
    CORP_ID: wxContext.CORP_ID,
    APPID: wxContext.APPID
  });

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
    console.log('[enterprise-info] 用户信息:', {
      user_type: user.user_type,
      corp_id: user.corp_id,
      wecom_corpid: user.wecom_corpid,
      corp_name: user.corp_name
    });

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

    // 获取 corp_id（优先级：配置中心 > user.corp_id > user.wecom_corpid > wxContext.CORP_ID）
    let corpId = null;
    
    // 1. 先从配置中心读取
    const wecomConfig = await getWecomConfig();
    if (wecomConfig && wecomConfig.corpId) {
      corpId = wecomConfig.corpId;
      console.log('[enterprise-info] 从配置中心获取企业ID:', corpId);
    }
    
    // 2. 如果配置中心没有，从用户信息获取
    if (!corpId) {
      corpId = user.corp_id || user.wecom_corpid || wxContext.CORP_ID;
      console.log('[enterprise-info] 从用户信息获取企业ID:', corpId);
    }

    if (!corpId) {
      console.error('[enterprise-info] 缺少企业ID，请检查企业微信配置');
      return {
        success: false,
        message: '缺少企业ID，请在管理后台配置企业微信信息，或先在企业微信环境中登录',
        data: {
          enterprise: null,
          members: [],
          departments: [],
          hint: '请联系管理员在 web-admin 后台配置企业微信信息'
        }
      };
    }

    var enterpriseResult = await db.collection('enterprises').where({
      corp_id: corpId
    }).get();

    var enterprise = null;
    if (enterpriseResult.data && enterpriseResult.data.length > 0) {
      enterprise = enterpriseResult.data[0];
    } else {
      var enterpriseData = {
        corp_id: corpId,
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

      console.log('[enterprise-info] 创建企业记录:', enterprise);
    }

    var membersResult = await db.collection('users').where({
      user_type: 'enterprise',
      corp_id: corpId
    }).field({
      openid: true,
      nickname: true,
      avatar_url: true,
      department: true,
      role: true,
      created_at: true
    }).orderBy('created_at', 'desc').get();

    var departmentsResult = await db.collection('departments').where({
      corp_id: corpId
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
