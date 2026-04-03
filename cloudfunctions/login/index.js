// cloudfunctions/login/index.js
// 事绩通 - 用户登录验证云函数
// 功能：微信登录 + 用户会话创建
// 注意：云函数可直接通过 cloud.getWXContext() 获取 OPENID，code 参数可选

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 主函数
exports.main = async (event, context) => {
  console.log('===== login 云函数开始执行 =====');
  console.log('[login] 接收参数:', JSON.stringify(event));
  
  const { code, userInfo, phoneData } = event;
  
  try {
    // 1. 通过云函数上下文获取 OPENID（推荐方式，不需要 code）
    const wxContext = cloud.getWXContext();
    const OPENID = wxContext.OPENID;
    const APPID = wxContext.APPID;
    
    console.log('[login] 获取到 OPENID:', OPENID);
    
    if (!OPENID) {
      console.error('[login] 无法获取 OPENID');
      return {
        success: false,
        code: 'NO_OPENID',
        message: '无法获取用户标识，请重试'
      };
    }

    // 2. 查询用户是否存在
    console.log('[login] 查询用户...');
    const userResult = await db.collection('users')
      .where({ openid: OPENID })
      .limit(1)
      .get();

    let user;
    let isNewUser = false;

    if (userResult.data.length > 0) {
      // 老用户 - 更新信息
      console.log('[login] 用户已存在，更新信息');
      user = userResult.data[0];
      await updateUser(user._id, userInfo);
    } else {
      // 新用户 - 创建记录
      console.log('[login] 新用户，创建记录');
      isNewUser = true;
      user = await createUser(OPENID, userInfo);
    }

    // 3. 生成会话 token
    const sessionToken = generateSessionToken(OPENID);
    
    // 4. 更新会话
    await updateSession(user._id, sessionToken);

    // 5. 返回登录结果
    console.log('[login] 登录成功，返回结果');
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
        needBindPhone: false,
        needJoinOrg: false
      }
    };

  } catch (error) {
    console.error('[login] 登录失败:', error);
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
/**
 * 创建新用户
 */
async function createUser(openid, userInfo) {
  const now = new Date();
  
  const userData = {
    openid: openid,
    nick_name: (userInfo && userInfo.nickName) || '微信用户',
    avatar_url: (userInfo && userInfo.avatarUrl) || '',
    gender: (userInfo && userInfo.gender) || 0,
    city: (userInfo && userInfo.city) || '',
    province: (userInfo && userInfo.province) || '',
    country: (userInfo && userInfo.country) || '',
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

  if (userInfo && userInfo.nickName) {
    updateData.nick_name = userInfo.nickName;
  }
  if (userInfo && userInfo.avatarUrl) {
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
