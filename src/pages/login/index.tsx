// 注意：头像选择和昵称输入必须使用 Taro 原生组件，因为需要 openType="chooseAvatar" 和 type="nickname"
// eslint-disable-next-line no-restricted-syntax
import { View, Text, Image, Input, Button } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Button as UIButton } from '@/components/ui/button';
import { CircleCheck, ListTodo, Users, TrendingUp, Camera } from 'lucide-react-taro';

export default function Login() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    // 如果已登录，直接跳转
    if (openid) {
      Taro.switchTab({ url: '/pages/index/index' });
    }
    
    // 尝试从本地存储恢复用户信息
    const storedUserInfo = Taro.getStorageSync('userInfo');
    if (storedUserInfo) {
      setAvatarUrl(storedUserInfo.avatarUrl || '');
      setNickname(storedUserInfo.nickName || '');
    }
  }, [openid]);

  // 选择头像（微信新版能力）
  const onChooseAvatar = (e: any) => {
    const { avatarUrl: newAvatarUrl } = e.detail;
    console.log('[Login] 选择的头像:', newAvatarUrl);
    setAvatarUrl(newAvatarUrl);
  };

  // 输入昵称
  const onInputNickname = (e: any) => {
    setNickname(e.detail.value);
  };

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
    // 检查是否同意协议
    if (!agreed) {
      Taro.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        // 如果没有填写昵称，使用默认值
        const finalNickname = nickname || '微信用户';
        let finalAvatarUrl = avatarUrl;

        // 如果头像是临时文件，需要上传到云存储
        if (avatarUrl && (avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://'))) {
          try {
            console.log('[Login] 上传头像到云存储...');
            // @ts-ignore
            const uploadRes = await wx.cloud.uploadFile({
              cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
              filePath: avatarUrl
            });
            if (uploadRes.fileID) {
              finalAvatarUrl = uploadRes.fileID;
              console.log('[Login] 头像上传成功:', finalAvatarUrl);
            }
          } catch (err) {
            console.error('[Login] 头像上传失败:', err);
            // 上传失败，使用空头像
            finalAvatarUrl = '';
          }
        }

        // 调用云函数进行登录/注册
        const loginRes = await callFunction<CloudResponse<{ 
          openid: string; 
          user_id: string;
          nickname: string;
          avatar_url: string;
        }>>(
          'user-login',
          {
            userInfo: {
              nickName: finalNickname,
              avatarUrl: finalAvatarUrl
            }
          }
        );

        console.log('[Login] 登录结果:', loginRes);

        if (loginRes.success && loginRes.data) {
          const userOpenid = loginRes.data.openid;
          const userInfo = {
            nickName: loginRes.data.nickname || finalNickname,
            avatarUrl: loginRes.data.avatar_url || finalAvatarUrl
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
          nickName: nickname || '测试用户', 
          avatarUrl: avatarUrl || '' 
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
    <View className="min-h-screen bg-white flex flex-col">
      {/* 顶部区域 */}
      <View className="flex-1 flex flex-col items-center justify-center px-8 pt-16">
        {/* Logo */}
        <View className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <CircleCheck size={40} color="#ffffff" />
        </View>

        {/* 标题 */}
        <Text className="text-2xl font-bold text-gray-800 mb-2">事绩通</Text>
        <Text className="text-sm text-gray-400 mb-8">高效任务管理，轻松团队协作</Text>

        {/* 用户信息设置区域 */}
        <View className="w-full bg-gray-50 rounded-2xl p-4 mb-4">
          <Text className="text-sm text-gray-500 mb-3 block">设置头像和昵称（可选）</Text>
          
          {/* 头像选择 */}
          <View className="flex items-center mb-4">
            <Button
              className="bg-transparent p-0 border-0"
              openType="chooseAvatar"
              onChooseAvatar={onChooseAvatar}
            >
              {avatarUrl ? (
                <Image
                  className="w-16 h-16 rounded-full"
                  src={avatarUrl}
                  mode="aspectFill"
                />
              ) : (
                <View className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <Camera size={24} color="#9CA3AF" />
                </View>
              )}
            </Button>
            <Text className="ml-4 text-sm text-gray-500">点击选择头像</Text>
          </View>

          {/* 昵称输入 */}
          <View className="flex items-center bg-white rounded-xl px-4 py-3">
            <Text className="text-sm text-gray-500 w-16">昵称</Text>
            <Input
              className="flex-1 text-base"
              type="nickname"
              placeholder="点击输入昵称"
              value={nickname}
              onInput={onInputNickname}
            />
          </View>
        </View>
      </View>

      {/* 功能特点 */}
      <View className="px-8 mb-6">
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

      {/* 登录按钮和协议 */}
      <View className="px-8 pb-12">
        {/* 协议勾选 */}
        <View className="flex items-start mb-4 bg-gray-50 rounded-xl p-4">
          <Button
            className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center p-0 mr-3 ${
              agreed ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 border-2'
            }`}
            onClick={toggleAgreement}
          >
            {agreed && (
              <Text className="text-white text-xs">✓</Text>
            )}
          </Button>
          <View className="flex-1">
            <Text className="text-sm text-gray-600 leading-relaxed">
              我已阅读并同意
              <Text className="text-blue-500" onClick={viewUserAgreement}>《用户服务协议》</Text>
              和
              <Text className="text-blue-500" onClick={viewPrivacyPolicy}>《隐私政策》</Text>
            </Text>
          </View>
        </View>

        <UIButton
          className={`w-full rounded-xl py-4 font-medium text-base ${
            agreed ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
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
