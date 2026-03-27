import { View, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { CircleCheck, ListTodo, Users, TrendingUp } from 'lucide-react-taro';

export default function Login() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
        let userInfo = { nickName: '微信用户', avatarUrl: '' };

        try {
          // @ts-ignore
          if (wx.getUserProfile) {
            // @ts-ignore
            const res = await wx.getUserProfile({
              desc: '用于完善用户资料'
            });
            userInfo = res.userInfo;
          }
        } catch (err) {
          console.log('用户拒绝授权，使用默认信息');
        }

        // 保存用户信息到本地
        Taro.setStorageSync('userInfo', userInfo);

        // 调用云函数进行登录/注册
        const loginRes = await callFunction<CloudResponse<{ openid: string; user_id: string }>>(
          'user-login',
          {
            userInfo: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl
            }
          }
        );

        console.log('[Login] 登录结果:', loginRes);

        if (loginRes.success && loginRes.data) {
          // 直接从返回值获取 openid，不再重新调用 getOpenId
          const userOpenid = loginRes.data.openid;
          console.log('[Login] 获取到 openid:', userOpenid);
          
          // 更新 store
          useUserStore.setState({ 
            openid: userOpenid, 
            isLoading: false
          });
          
          Taro.switchTab({ url: '/pages/index/index' });
        } else {
          Taro.showToast({ title: loginRes.message || '登录失败', icon: 'none' });
        }
      } else {
        // H5 端：模拟登录
        const mockUserInfo = { nickName: '测试用户', avatarUrl: '' };
        Taro.setStorageSync('userInfo', mockUserInfo);
        
        // 模拟 openid
        useUserStore.setState({ 
          openid: 'mock_openid', 
          isLoading: false
        });
        
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
    <View className="min-h-screen bg-white flex flex-col">
      {/* 顶部区域 */}
      <View className="flex-1 flex flex-col items-center justify-center px-8 pt-16">
        {/* Logo */}
        <View className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <CircleCheck size={40} color="#ffffff" />
        </View>

        {/* 标题 */}
        <Text className="text-2xl font-bold text-gray-800 mb-2">事绩通</Text>
        <Text className="text-sm text-gray-400 mb-12">高效任务管理，轻松团队协作</Text>
      </View>

      {/* 功能特点 */}
      <View className="px-8 mb-8">
        <View className="flex items-center py-3">
          <View className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mr-4">
            <ListTodo size={20} color="#1377EB" />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-800">任务全流程管理</Text>
            <Text className="text-xs text-gray-400">创建、分配、执行、复盘</Text>
          </View>
        </View>

        <View className="flex items-center py-3">
          <View className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mr-4">
            <TrendingUp size={20} color="#22C55E" />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-800">智能评分分析</Text>
            <Text className="text-xs text-gray-400">自动评分，数据驱动改进</Text>
          </View>
        </View>

        <View className="flex items-center py-3">
          <View className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mr-4">
            <Users size={20} color="#9333EA" />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-800">团队协作</Text>
            <Text className="text-xs text-gray-400">多人协作，高效沟通</Text>
          </View>
        </View>
      </View>

      {/* 登录按钮 */}
      <View className="px-8 pb-12">
        <Button
          className="w-full bg-blue-500 text-white rounded-xl py-4 font-medium text-base"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? '登录中...' : '微信快捷登录'}
        </Button>

        {/* 协议提示 */}
        <Text className="text-gray-400 text-xs mt-4 text-center block">
          登录即表示同意
          <Text className="text-blue-500">《用户服务协议》</Text>
          和
          <Text className="text-blue-500">《隐私政策》</Text>
        </Text>
      </View>
    </View>
  );
}
