// cloudfunctions/checklist-add/index.js
// 事绩通 - 添加清单项

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { task_id, content } = event;
  
  // 参数验证
  if (!task_id || !content) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '任务 ID 和清单内容不能为空'
    };
  }

  try {
    const { OPENID } = cloud.getWXContext();
    const now = new Date();

    // 添加清单项
    const result = await db.collection('checklists').add({
      data: {
        task_id: task_id,
        content: content,
        is_completed: false,
        completed_by: null,
        completed_at: null,
        created_by: OPENID,
        created_at: now,
        updated_at: now,
        order: 0 // 后续可优化排序
      }
    });

    return {
      success: true,
      code: 'ADD_SUCCESS',
      message: '清单项添加成功',
      data: {
        checklistId: result._id
      }
    };

  } catch (error) {
    console.error('添加清单项失败:', error);
    return {
      success: false,
      code: 'ADD_ERROR',
      message: '添加失败，请稍后重试',
      error: error.message
    };
  }
};
