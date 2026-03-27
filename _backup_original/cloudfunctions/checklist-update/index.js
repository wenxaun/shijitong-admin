// cloudfunctions/checklist-update/index.js
// 事绩通 - 更新清单项（勾选/取消）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { checklist_id, is_completed } = event;
  
  // 参数验证
  if (!checklist_id) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '清单项 ID 不能为空'
    };
  }

  try {
    const { OPENID } = cloud.getWXContext();
    const now = new Date();

    // 更新清单项
    const updateData = {
      is_completed: is_completed,
      updated_at: now
    };

    // 完成时记录完成人和时间
    if (is_completed) {
      updateData.completed_by = OPENID;
      updateData.completed_at = now;
    } else {
      updateData.completed_by = null;
      updateData.completed_at = null;
    }

    await db.collection('checklists')
      .doc(checklist_id)
      .update({
        data: updateData
      });

    return {
      success: true,
      code: 'UPDATE_SUCCESS',
      message: '清单项更新成功'
    };

  } catch (error) {
    console.error('更新清单项失败:', error);
    return {
      success: false,
      code: 'UPDATE_ERROR',
      message: '更新失败，请稍后重试',
      error: error.message
    };
  }
};
