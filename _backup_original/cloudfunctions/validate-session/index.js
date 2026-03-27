// cloudfunctions/validate-session/index.js
// 事绩通 - 验证会话 token

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { token } = event;
  
  // 参数验证
  if (!token) {
    return {
      success: false,
      code: 'INVALID_PARAMS',
      message: '会话 token 不能为空',
      valid: false
    };
  }

  try {
    const now = new Date();

    // 查询会话
    const sessionResult = await db.collection('sessions')
      .where({
        token: token,
        expires_at: _.gt(now) // 未过期
      })
      .limit(1)
      .get();

    if (sessionResult.data.length > 0) {
      const session = sessionResult.data[0];
      
      return {
        success: true,
        code: 'VALID',
        message: '会话有效',
        valid: true,
        data: {
          userId: session.user_id,
          expiresAt: session.expires_at
        }
      };
    } else {
      return {
        success: true,
        code: 'INVALID',
        message: '会话已过期或不存在',
        valid: false
      };
    }

  } catch (error) {
    console.error('验证会话失败:', error);
    return {
      success: false,
      code: 'VALIDATE_ERROR',
      message: '验证失败，请稍后重试',
      valid: false,
      error: error.message
    };
  }
};
