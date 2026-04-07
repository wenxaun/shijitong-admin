// 登录页面 - 简洁版
import { View, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Button as UIButton } from '@/components/ui/button';
import { CircleCheck } from 'lucide-react-taro';

export default function Login() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    // 如果已登录，直接跳转
    if (openid) {
      Taro.switchTab({ url: '/pages/index/index' });
    }
  }, [openid]);

  // 勾选/取消勾选协议
  const toggleAgreement = () => {
    setAgreed(!agreed);
  };

  // 查看用户服务协议
  const viewUserAgreement = () => {
    Taro.navigateTo({ url: '/pages/agreement/index' });
  };

  // 查看隐私政策
  const viewPrivacyPolicy = () => {
    Taro.navigateTo({ url: '/pages/privacy/index' });
  };

  // 微信登录
  const handleLogin = async () => {
    if (!agreed) {
      Taro.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        // 调用云函数进行登录/注册（微信会自动获取用户信息）
        const loginRes = await callFunction<CloudResponse<{ 
          openid: string; 
          user_id: string;
          nickname: string;
          avatar_url: string;
        }>>(
          'user-login',
          {}
        );

        console.log('[Login] 登录结果:', loginRes);

        if (loginRes.success && loginRes.data) {
          const userOpenid = loginRes.data.openid;
          const userInfo = {
            nickName: loginRes.data.nickname || '微信用户',
            avatarUrl: loginRes.data.avatar_url || ''
          };
          
          // 保存用户信息到本地
          Taro.setStorageSync('userInfo', userInfo);
          
          // 更新 store
          useUserStore.setState({ 
            openid: userOpenid, 
            userInfo: userInfo as any,
            isLoading: false
          });
          
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
        
        useUserStore.setState({ 
          openid: 'mock_openid', 
          userInfo: mockUserInfo as any,
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
    <View className="min-h-screen bg-white flex flex-col items-center px-6">
      {/* 顶部区域 */}
      <View className="flex-1 flex flex-col items-center justify-center">
        {/* Logo */}
        <View className="w-24 h-24 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <CircleCheck size={48} color="#ffffff" />
        </View>

        {/* 标题 */}
        <Text className="text-2xl font-bold text-gray-800 mb-2">事绩通</Text>
        <Text className="text-sm text-gray-400">高效任务管理</Text>
      </View>

      {/* 底部区域 */}
      <View className="w-full pb-12">
        {/* 协议勾选 */}
        <View className="flex items-start mb-4">
          <View 
            className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center mr-3 ${
              agreed ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            onClick={toggleAgreement}
          >
            {agreed && (
              <Text className="text-white text-xs">✓</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-600 leading-relaxed">
              我已阅读并同意
              <Text className="text-blue-500" onClick={viewUserAgreement}>《用户服务协议》</Text>
              和
              <Text className="text-blue-500" onClick={viewPrivacyPolicy}>《隐私政策》</Text>
            </Text>
          </View>
        </View>

        {/* 登录按钮 */}
        <UIButton
          className={`w-full rounded-xl py-4 font-medium text-base ${
            agreed ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? '登录中...' : '微信快捷登录'}
        </UIButton>
      </View>
    </View>
  );
}
