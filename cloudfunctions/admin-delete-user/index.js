const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { target_openid } = event;
  const wxContext = cloud.getWXContext();

  if (!target_openid) {
    return {
      success: false,
      message: '缺少目标用户ID'
    };
  }

  try {
    // 检查用户是否存在
    const userResult = await db.collection('users').where({
      openid: target_openid
    }).get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const results = [];
    const errors = [];

    // 先删除用户的所有相关数据
    const collections = [
      {
        name: 'task',
        filter: _.or([
          { publisher_id: target_openid },
          { executor_id: target_openid }
        ])
      },
      {
        name: 'task_group',
        filter: { user_id: target_openid }
      },
      {
        name: 'team',
        filter: _.or([
          { leader_id: target_openid },
          { members: _.elemMatch(target_openid) }
        ])
      },
      {
        name: 'checklist',
        filter: { user_id: target_openid }
      },
      {
        name: 'subtask',
        filter: { user_id: target_openid }
      },
      {
        name: 'comment',
        filter: { user_id: target_openid }
      },
      {
        name: 'task_history',
        filter: { user_id: target_openid }
      },
      {
        name: 'notification',
        filter: { user_id: target_openid }
      },
      {
        name: 'weekly_report',
        filter: { user_id: target_openid }
      }
    ];

    for (const collection of collections) {
      try {
        const snapshot = await db.collection(collection.name).where(collection.filter).get();
        const count = snapshot.data.length;

        if (count > 0) {
          const deletePromises = snapshot.data.map(doc =>
            db.collection(collection.name).doc(doc._id).remove()
          );

          await Promise.all(deletePromises);
          results.push({
            collection: collection.name,
            count: count,
            status: 'success'
          });
        }
      } catch (error) {
        errors.push({
          collection: collection.name,
          error: error.message
        });
      }
    }

    // 最后删除用户记录
    try {
      await db.collection('users').where({
        openid: target_openid
      }).remove();
      results.push({
        collection: 'user',
        count: 1,
        status: 'success'
      });
    } catch (error) {
      errors.push({
        collection: 'user',
        error: error.message
      });
    }

    return {
      success: true,
      message: '删除用户成功',
      data: {
        target_openid,
        results,
        errors,
        totalDeleted: results.reduce((sum, r) => sum + r.count, 0)
      }
    };

  } catch (error) {
    console.error('[AdminDeleteUser] Error:', error);
    return {
      success: false,
      message: '删除用户失败',
      error: error.message
    };
  }
};
