// pages/login/login.js - v5.0.7 登录功能增强
// 事绩通 - 登录页（支持微信登录 + 用户信息完善）

const app = getApp()

Page({
  data: {
    loading: false,
    userInfo: null
  },

  onLoad: function (options) {
    // 检查是否已登录
    this.checkLoginStatus();
  },

  /**
   * 微信登录按钮点击
   */
  async onWechatLogin() {
    this.setData({ loading: true });

    try {
      // 1. 获取 code
      const { code } = await wx.login();

      // 2. 获取用户信息（头像选择）
      const userInfo = await this.getUserProfile();

      // 3. 调用登录云函数
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          code: code,
          userInfo: userInfo
        }
      });

      const result = res.result;

      if (result.success) {
        // 4. 保存登录状态
        await this.saveLoginState(result.data);

        // 5. 根据状态跳转
        if (result.data.needBindPhone) {
          wx.redirectTo({ url: '/pages/register/register' });
        } else if (result.data.needJoinOrg) {
          wx.redirectTo({ url: '/pages/org-create/org-create' });
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }

        wx.showToast({
          title: result.data.isNewUser ? '注册成功' : '登录成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message,
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 获取用户信息（飞书风格头像选择）
   */
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo);
        },
        fail: (err) => {
          // 用户拒绝，使用默认信息
          resolve({
            nickName: '微信用户',
            avatarUrl: ''
          });
        }
      });
    });
  },

  /**
   * 保存登录状态到本地
   */
  async saveLoginState(data) {
    try {
      // 确保 openid 存在
      if (!data.openid) {
        console.error('登录返回数据缺少 openid:', data)
        throw new Error('登录数据不完整')
      }

      wx.setStorageSync('userId', data.userId);
      wx.setStorageSync('openid', data.openid);
      wx.setStorageSync('sessionToken', data.sessionToken);
      wx.setStorageSync('userInfo', data.userInfo);
      wx.setStorageSync('isLoggedIn', true);
      
      // 更新全局数据
      app.globalData.userId = data.userId;
      app.globalData.openid = data.openid;
      app.globalData.userInfo = data.userInfo;
      
      console.log('登录状态已保存:', {
        userId: data.userId,
        openid: data.openid,
        hasSessionToken: !!data.sessionToken
      })
    } catch (error) {
      console.error('保存登录状态失败:', error)
      throw error
    }
  },

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const sessionToken = wx.getStorageSync('sessionToken');

    if (isLoggedIn && sessionToken) {
      // 验证会话是否过期
      const isValid = await this.validateSession(sessionToken);
      if (isValid) {
        wx.switchTab({ url: '/pages/index/index' });
        return;
      }
    }

    // 未登录，停留在登录页
  },

  /**
   * 验证会话
   */
  async validateSession(token) {
    try {
      // TODO: 实现 validate-session 云函数
      // 暂时简化处理，认为 token 有效
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 跳转到注册页
   */
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  /**
   * 显示用户协议
   */
  showTerms() {
    wx.showModal({
      title: '用户协议',
      content: '请阅读并同意用户协议和隐私政策。使用本小程序即表示您同意我们的服务条款。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 显示隐私政策
   */
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护。您的个人信息将仅用于提供事绩通服务，不会泄露给第三方。',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
})
