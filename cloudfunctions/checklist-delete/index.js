// cloudfunctions/checklist-delete/index.js
// 事绩通 - 删除清单项

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { checklist_id } = event;
  
  // 参数验证
  if (!checklist_id) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '清单项 ID 不能为空'
    };
  }

  try {
    // 删除清单项
    await db.collection('checklists')
      .doc(checklist_id)
      .remove();

    return {
      success: true,
      code: 'DELETE_SUCCESS',
      message: '清单项删除成功'
    };

  } catch (error) {
    console.error('删除清单项失败:', error);
    return {
      success: false,
      code: 'DELETE_ERROR',
      message: '删除失败，请稍后重试',
      error: error.message
    };
  }
};
