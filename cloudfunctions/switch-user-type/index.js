const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { openid, targetUserType } = event;
  const wxContext = cloud.getWXContext();

  if (!openid) {
    return {
      success: false,
      message: '缺少openid'
    };
  }

  if (!targetUserType || !['personal', 'enterprise'].includes(targetUserType)) {
    return {
      success: false,
      message: '无效的目标用户类型'
    };
  }

  try {
    // 1. 查询当前用户信息
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const user = userResult.data[0];

    // 2. 如果已经是目标类型，无需切换
    if (user.user_type === targetUserType) {
      return {
        success: true,
        message: `当前已经是${targetUserType === 'enterprise' ? '企业' : '个人'}模式`,
        data: { user_type: targetUserType }
      };
    }

    // 3. 切换到企业模式时，检查是否在企业微信环境
    if (targetUserType === 'enterprise') {
      // 如果没有企业信息，从环境获取
      const wecomData = event.wecomData || {};

      const updateData = {
        user_type: 'enterprise',
        is_wework_user: true,
        wecom_userid: wecomData.userid || user.wecom_userid,
        wecom_corpid: wecomData.corpid || user.wecom_corpid,
        corp_name: wecomData.corpName || user.corp_name,
        corp_id: wecomData.corpid || user.corp_id,
        department: wecomData.department || user.department,
        updated_at: new Date().toISOString()
      };

      await db.collection('users').doc(user._id).update({
        data: updateData
      });
    } else {
      // 切换到个人模式
      await db.collection('users').doc(user._id).update({
        data: {
          user_type: 'personal',
          is_wework_user: false,
          updated_at: new Date().toISOString()
        }
      });
    }

    return {
      success: true,
      message: `已切换到${targetUserType === 'enterprise' ? '企业' : '个人'}模式`,
      data: { user_type: targetUserType }
    };

  } catch (error) {
    console.error('[SwitchUserType] Error:', error);
    return {
      success: false,
      message: '切换模式失败',
      error: error.message
    };
  }
};
