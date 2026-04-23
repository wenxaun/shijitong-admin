const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();

  try {
    // 获取所有集合名称
    const collections = [
      'user',              // 用户
      'task',              // 任务
      'task_group',        // 任务分组
      'team',              // 团队
      'enterprise',        // 企业
      'department',        // 部门
      'checklist',         // 检查清单
      'subtask',           // 子任务
      'comment',           // 评论
      'task_history',      // 任务历史
      'notification',      // 通知
      'weekly_report'      // 周报
    ];

    const results = [];
    const errors = [];

    // 遍历所有集合并删除数据
    for (const collectionName of collections) {
      try {
        // 先获取集合中的所有数据ID
        const snapshot = await db.collection(collectionName).get();
        const count = snapshot.data.length;

        if (count > 0) {
          // 批量删除
          const deletePromises = snapshot.data.map(doc =>
            db.collection(collectionName).doc(doc._id).remove()
          );

          await Promise.all(deletePromises);
          results.push({
            collection: collectionName,
            count: count,
            status: 'success'
          });
        } else {
          results.push({
            collection: collectionName,
            count: 0,
            status: 'empty'
          });
        }
      } catch (error) {
        errors.push({
          collection: collectionName,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: '清除完成',
      data: {
        results,
        errors,
        totalCollections: collections.length,
        successCount: results.filter(r => r.status === 'success').length
      }
    };

  } catch (error) {
    console.error('[AdminClearAllData] Error:', error);
    return {
      success: false,
      message: '清除数据失败',
      error: error.message
    };
  }
};
