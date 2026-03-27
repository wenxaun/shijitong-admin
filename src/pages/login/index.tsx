import { View, Text } from '@tarojs/components';
import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { Button } from '@/components/ui/button';

export default function Login() {
  const { init, openid } = useUserStore();

  useEffect(() => {
    if (openid) {
      Taro.switchTab({ url: '/pages/index/index' });
    }
  }, [openid]);

  const handleLogin = async () => {
    try {
      // 获取用户信息
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        // @ts-ignore
        const { userInfo } = await wx.getUserProfile({
          desc: '用于完善用户资料'
        });
        Taro.setStorageSync('userInfo', userInfo);
      }
      
      await init();
      Taro.switchTab({ url: '/pages/index/index' });
    } catch (err) {
      console.error('登录失败:', err);
      Taro.showToast({ title: '登录失败', icon: 'none' });
    }
  };

  return (
    <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6">
      <Text className="text-4xl font-bold text-blue-500 mb-4">事绩通</Text>
      <Text className="text-gray-500 mb-8">高效任务管理</Text>
      
      <Button
        className="w-full bg-blue-500 text-white rounded-lg py-3"
        onClick={handleLogin}
      >
        微信登录
      </Button>
    </View>
  );
}
