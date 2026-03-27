import { View, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Button } from '@/components/ui/button';

interface UserInfo {
  nickName: string;
  avatarUrl: string;
}

export default function Login() {
  const { init, openid } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [canUseGetUserProfile, setCanUseGetUserProfile] = useState(false);

  useEffect(() => {
    // 检查是否支持 getUserProfile
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      // @ts-ignore
      if (wx.getUserProfile) {
        setCanUseGetUserProfile(true);
      }
    }

    // 如果已登录，直接跳转
    if (openid) {
      Taro.switchTab({ url: '/pages/index/index' });
    }
  }, [openid]);

  // 微信登录
  const handleLogin = async () => {
    setLoading(true);
    try {
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        // 小程序端：获取用户信息
        let userInfo: UserInfo = { nickName: '微信用户', avatarUrl: '' };

        try {
          // 尝试使用 getUserProfile（新版API）
          if (canUseGetUserProfile) {
            // @ts-ignore
            const res = await wx.getUserProfile({
              desc: '用于完善用户资料'
            });
            userInfo = res.userInfo;
          }
        } catch (err) {
          console.log('用户拒绝授权或获取用户信息失败，使用默认信息');
        }

        // 保存用户信息到本地
        Taro.setStorageSync('userInfo', userInfo);

        // 调用云函数进行登录/注册
        const loginRes = await callFunction<CloudResponse<{ openid: string; registered: boolean }>>(
          'user-login',
          {
            nickname: userInfo.nickName,
            avatar_url: userInfo.avatarUrl
          }
        );

        if (loginRes.success) {
          await init();
          Taro.switchTab({ url: '/pages/index/index' });
        } else {
          Taro.showToast({ title: loginRes.message || '登录失败', icon: 'none' });
        }
      } else {
        // H5 端：模拟登录
        const mockUserInfo = {
          nickName: '测试用户',
          avatarUrl: ''
        };
        Taro.setStorageSync('userInfo', mockUserInfo);
        await init();
        Taro.switchTab({ url: '/pages/index/index' });
      }
    } catch (err) {
      console.error('登录失败:', err);
      Taro.showToast({ title: '登录失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-500 to-blue-600 px-8">
      {/* Logo 区域 */}
      <View className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-lg">
        <Text className="text-4xl font-bold text-blue-500">事</Text>
      </View>

      <Text className="text-3xl font-bold text-white mb-2">事绩通</Text>
      <Text className="text-blue-100 mb-12">高效任务管理，团队协作利器</Text>

      {/* 功能特点 */}
      <View className="w-full mb-10">
        <View className="flex items-center mb-4">
          <View className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
            <Text className="text-white text-sm">✓</Text>
          </View>
          <Text className="text-white text-sm">任务全流程管理</Text>
        </View>
        <View className="flex items-center mb-4">
          <View className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
            <Text className="text-white text-sm">✓</Text>
          </View>
          <Text className="text-white text-sm">智能评分与复盘分析</Text>
        </View>
        <View className="flex items-center">
          <View className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
            <Text className="text-white text-sm">✓</Text>
          </View>
          <Text className="text-white text-sm">团队协作与数据统计</Text>
        </View>
      </View>

      {/* 登录按钮 */}
      <Button
        className="w-full bg-white text-blue-500 rounded-full py-4 font-semibold text-lg shadow-lg"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? '登录中...' : '微信快捷登录'}
      </Button>

      {/* 协议提示 */}
      <Text className="text-blue-200 text-xs mt-6 text-center">
        登录即表示同意《用户服务协议》和《隐私政策》
      </Text>
    </View>
  );
}
