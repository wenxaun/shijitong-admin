import { View, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';

export default function Splash() {
  const init = useUserStore(state => state.init);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      console.log('[Splash] 开始初始化...');
      
      // 初始化用户状态
      await init();
      
      // 标记初始化完成
      setIsInitialized(true);
    };

    checkLogin();
  }, [init]);

  // 当初始化完成后，检查登录状态并跳转
  useEffect(() => {
    if (!isInitialized) return;
    
    // 从 store 中获取最新的 openid
    const openid = useUserStore.getState().openid;
    console.log('[Splash] 初始化完成，openid:', openid);
    
    // 延迟跳转，展示启动页
    const timer = setTimeout(() => {
      if (openid) {
        console.log('[Splash] 已登录，跳转首页');
        Taro.reLaunch({ url: '/pages/index/index' });
      } else {
        console.log('[Splash] 未登录，跳转登录页');
        Taro.redirectTo({ url: '/pages/login/index' });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isInitialized]);

  return (
    <View className="flex flex-col items-center justify-center h-screen bg-blue-500">
      <Text className="text-4xl font-bold text-white mb-4">事绩通</Text>
      <Text className="text-blue-100">高效任务管理</Text>
    </View>
  );
}
