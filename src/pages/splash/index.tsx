import { View, Text } from '@tarojs/components';
import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';

export default function Splash() {
  const { init, openid } = useUserStore();

  useEffect(() => {
    const checkLogin = async () => {
      await init();
      
      // 延迟跳转，展示启动页
      setTimeout(() => {
        if (openid) {
          Taro.switchTab({ url: '/pages/index/index' });
        } else {
          Taro.redirectTo({ url: '/pages/login/index' });
        }
      }, 1000);
    };

    checkLogin();
  }, [init, openid]);

  return (
    <View className="flex flex-col items-center justify-center h-screen bg-blue-500">
      <Text className="text-4xl font-bold text-white mb-4">事绩通</Text>
      <Text className="text-blue-100">高效任务管理</Text>
    </View>
  );
}
