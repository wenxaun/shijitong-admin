// cloudfunctions/login/index.js
// 事绩通 - 用户登录验证云函数
// 功能：微信登录 code 换 openid + 用户会话创建

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 主函数
exports.main = async (event, context) => {
  const { code, userInfo, phoneData } = event;
  
  // 1. 参数验证
  if (!code) {
    return {
      success: false,
      code: 'INVALID_CODE',
      message: '登录 code 不能为空'
    };
  }

  try {
    // 2. 微信登录 code 换 openid
    const { OPENID, APPID } = cloud.getWXContext();
    
    if (!OPENID) {
      // code 换 openid（备用方案）
      const wxResult = await wxCodeToOpenid(code);
      if (!wxResult.success) {
        return wxResult;
      }
      OPENID = wxResult.openid;
    }

    // 3. 查询用户是否存在
    const userResult = await db.collection('users')
      .where({ openid: OPENID })
      .limit(1)
      .get();

    let user;
    let isNewUser = false;

    if (userResult.data.length > 0) {
      // 老用户 - 更新信息
      user = userResult.data[0];
      await updateUser(user._id, userInfo);
    } else {
      // 新用户 - 创建记录
      isNewUser = true;
      user = await createUser(OPENID, userInfo);
    }

    // 4. 生成会话 token
    const sessionToken = generateSessionToken(OPENID);
    
    // 5. 更新会话
    await updateSession(user._id, sessionToken);

    // 6. 返回登录结果
    // 已注册用户直接登录，不强制绑定手机/加入组织（可在个人页完善）
    return {
      success: true,
      code: 'LOGIN_SUCCESS',
      message: isNewUser ? '注册成功' : '登录成功',
      data: {
        userId: user._id,
        openid: OPENID,
        sessionToken: sessionToken,
        userInfo: {
          nickName: user.nick_name,
          avatarUrl: user.avatar_url,
          hasPhone: !!user.phone,
          hasOrg: user.org_id ? true : false
        },
        isNewUser: isNewUser,
        // 已注册用户直接登录，只有真正新用户才需要完善信息
        needBindPhone: false,  // 不再强制绑定手机
        needJoinOrg: false     // 不再强制加入组织
      }
    };

  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      code: 'LOGIN_ERROR',
      message: '登录失败，请稍后重试',
      error: error.message
    };
  }
};

/**
 * 微信 code 换 openid（备用方案）
 */
async function wxCodeToOpenid(code) {
  const { APPID, APPSECRET } = cloud.getAppConfig();
  
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`;
  
  try {
    const res = await cloud.request({ url });
    const data = res.data;
    
    if (data.errcode) {
      return {
        success: false,
        code: 'WX_API_ERROR',
        message: `微信接口错误：${data.errmsg}`
      };
    }
    
    return {
      success: true,
      openid: data.openid,
      session_key: data.session_key
    };
  } catch (error) {
    return {
      success: false,
      code: 'REQUEST_ERROR',
      message: '网络请求失败'
    };
  }
}

/**
 * 创建新用户
 */
async function createUser(openid, userInfo) {
  const now = new Date();
  
  const userData = {
    openid: openid,
    nick_name: userInfo?.nickName || '微信用户',
    avatar_url: userInfo?.avatarUrl || '',
    gender: userInfo?.gender || 0,
    city: userInfo?.city || '',
    province: userInfo?.province || '',
    country: userInfo?.country || '',
    phone: null,
    org_id: null,
    dept_id: null,
    role: 'member', // 默认角色
    status: 'active',
    created_at: now,
    updated_at: now,
    last_login_at: now,
    login_count: 1
  };

  const result = await db.collection('users').add({ data: userData });
  return { ...userData, _id: result._id };
}

/**
 * 更新用户信息
 */
async function updateUser(userId, userInfo) {
  const updateData = {
    updated_at: new Date(),
    last_login_at: new Date(),
    login_count: _.inc(1)
  };

  if (userInfo?.nickName) {
    updateData.nick_name = userInfo.nickName;
  }
  if (userInfo?.avatarUrl) {
    updateData.avatar_url = userInfo.avatarUrl;
  }

  await db.collection('users')
    .doc(userId)
    .update({ data: updateData });
}

/**
 * 生成会话 token
 * 简单实现：openid + 时间戳 + 随机数 的 MD5
 */
function generateSessionToken(openid) {
  const crypto = require('crypto');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const raw = `${openid}${timestamp}${random}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

/**
 * 更新用户会话
 */
async function updateSession(userId, sessionToken) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天有效期

  try {
    // 尝试更新现有会话
    const sessionResult = await db.collection('sessions')
      .where({ user_id: userId })
      .limit(1)
      .get();

    if (sessionResult.data.length > 0) {
      // 更新会话
      await db.collection('sessions')
        .doc(sessionResult.data[0]._id)
        .update({
          data: {
            token: sessionToken,
            expires_at: expiresAt,
            updated_at: new Date()
          }
        });
    } else {
      // 创建新会话
      await db.collection('sessions').add({
        data: {
          user_id: userId,
          token: sessionToken,
          expires_at: expiresAt,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
  } catch (error) {
    console.error('会话更新失败:', error);
    // 会话失败不影响登录主流程
  }
}
