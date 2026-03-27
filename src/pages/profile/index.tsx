// 注意：头像选择和昵称输入必须使用 Taro 原生组件，因为需要 openType="chooseAvatar" 和 type="nickname"
// eslint-disable-next-line no-restricted-syntax
import { View, Text, Image, Input, Button } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button as UIButton } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Camera, ChevronRight, LogOut } from 'lucide-react-taro';

// 菜单项配置
const MENU_ITEMS = [
  { icon: '📜', label: '历史任务', path: '/pages/history/index' },
  { icon: '📊', label: '周报', path: '/pages/weekly/index' },
  { icon: '📈', label: '数据统计', path: '/pages/stats/index' },
  { icon: '⚙️', label: '提醒设置', path: '/pages/settings/index' },
  { icon: '👥', label: '我的团队', path: '/pages/team/index' }
];

export default function Profile() {
  const { openid, logout } = useUserStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname, setNickname] = useState('微信用户');
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  // 加载用户信息
  const loadUserInfo = () => {
    // 从 store 获取
    const storeUserInfo = useUserStore.getState().userInfo;
    if (storeUserInfo) {
      setAvatarUrl(storeUserInfo.avatarUrl || '');
      setNickname(storeUserInfo.nickName || '微信用户');
    } else {
      // 从本地存储获取
      const storedUserInfo = Taro.getStorageSync('userInfo');
      if (storedUserInfo) {
        setAvatarUrl(storedUserInfo.avatarUrl || '');
        setNickname(storedUserInfo.nickName || '微信用户');
      }
    }
  };

  // 选择头像
  const onChooseAvatar = async (e: any) => {
    const { avatarUrl: newAvatarUrl } = e.detail;
    console.log('[Profile] 选择的头像:', newAvatarUrl);
    setAvatarUrl(newAvatarUrl);
    
    // 上传头像到云存储并更新用户信息
    if (newAvatarUrl && Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      try {
        // 上传到云存储
        // @ts-ignore
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: newAvatarUrl
        });
        
        if (uploadRes.fileID) {
          console.log('[Profile] 头像上传成功:', uploadRes.fileID);
          // 更新到云端
          await updateUserInfo({ avatarUrl: uploadRes.fileID });
          setAvatarUrl(uploadRes.fileID);
        }
      } catch (err) {
        console.error('[Profile] 头像上传失败:', err);
        Taro.showToast({ title: '头像上传失败', icon: 'none' });
      }
    }
  };

  // 开始编辑昵称
  const startEditNickname = () => {
    setEditNickname(nickname);
    setIsEditing(true);
  };

  // 保存昵称
  const saveNickname = async () => {
    if (!editNickname.trim()) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    
    setSaving(true);
    try {
      await updateUserInfo({ nickName: editNickname.trim() });
      setNickname(editNickname.trim());
      setIsEditing(false);
      Taro.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setIsEditing(false);
    setEditNickname('');
  };

  // 更新用户信息到云端
  const updateUserInfo = async (info: { nickName?: string; avatarUrl?: string }) => {
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const res = await callFunction<CloudResponse<{}>>(
        'user-update',
        {
          nickname: info.nickName,
          avatar_url: info.avatarUrl
        }
      );
      
      if (!res.success) {
        throw new Error(res.message || '更新失败');
      }
    }
    
    // 更新本地存储
    const storedUserInfo = Taro.getStorageSync('userInfo') || {};
    const newUserInfo = { ...storedUserInfo, ...info };
    Taro.setStorageSync('userInfo', newUserInfo);
    
    // 更新 store
    useUserStore.setState({ userInfo: newUserInfo as any });
  };

  // 跳转页面
  const navigateTo = (path: string) => {
    Taro.navigateTo({ url: path });
  };

  // 退出登录
  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          Taro.removeStorageSync('userInfo');
          Taro.redirectTo({ url: '/pages/login/index' });
        }
      }
    });
  };

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 用户头部 */}
      <View className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-8 pb-6">
        <View className="flex items-center">
          {/* 头像（可点击修改） */}
          <Button
            className="bg-transparent p-0 border-0 relative"
            openType="chooseAvatar"
            onChooseAvatar={onChooseAvatar}
          >
            {avatarUrl ? (
              <Image
                className="w-16 h-16 rounded-full border-2 border-white"
                src={avatarUrl}
                mode="aspectFill"
              />
            ) : (
              <View className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center border-2 border-white">
                <Text className="text-2xl text-white font-semibold">
                  {nickname ? nickname[0] : '我'}
                </Text>
              </View>
            )}
            {/* 编辑图标 */}
            <View className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
              <Camera size={14} color="#1377EB" />
            </View>
          </Button>
          
          {/* 昵称（可点击修改） */}
          <View className="ml-4 flex-1">
            {isEditing ? (
              <View className="flex items-center gap-2">
                <Input
                  className="flex-1 bg-white bg-opacity-20 rounded-lg px-3 py-2 text-white text-base"
                  type="nickname"
                  placeholder="输入昵称"
                  value={editNickname}
                  onInput={(e) => setEditNickname(e.detail.value)}
                />
                <View className="flex gap-1">
                  <View 
                    className="px-3 py-1 bg-white bg-opacity-20 rounded-lg"
                    onClick={saveNickname}
                  >
                    <Text className="text-white text-sm">{saving ? '保存中...' : '保存'}</Text>
                  </View>
                  <View 
                    className="px-3 py-1 bg-white bg-opacity-20 rounded-lg"
                    onClick={cancelEdit}
                  >
                    <Text className="text-white text-sm">取消</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="flex items-center" onClick={startEditNickname}>
                <Text className="text-xl text-white font-semibold">{nickname}</Text>
                <Text className="text-blue-100 text-sm ml-2">点击修改</Text>
              </View>
            )}
            {openid && !isEditing && (
              <Text className="text-blue-100 text-sm mt-1 block">
                ID: {openid.slice(-8)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 功能菜单 */}
      <View className="px-3 py-4">
        <Text className="text-sm text-gray-500 mb-2 px-1">功能</Text>
        <Card>
          <CardContent className="p-0">
            {MENU_ITEMS.map((item, index) => (
              <View key={item.path}>
                <View
                  className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                  onClick={() => navigateTo(item.path)}
                >
                  <View className="flex items-center">
                    <Text className="text-xl mr-3">{item.icon}</Text>
                    <Text className="text-base text-gray-800">{item.label}</Text>
                  </View>
                  <ChevronRight size={20} color="#D1D5DB" />
                </View>
                {index < MENU_ITEMS.length - 1 && <Separator className="mx-4" />}
              </View>
            ))}
          </CardContent>
        </Card>
      </View>

      {/* 退出登录 */}
      {openid && (
        <View className="px-3 py-4">
          <UIButton
            variant="outline"
            className="w-full text-gray-600"
            onClick={handleLogout}
          >
            <LogOut size={16} color="#6B7280" />
            <Text className="ml-2">退出登录</Text>
          </UIButton>
        </View>
      )}

      {/* 版本信息 */}
      <View className="flex justify-center py-6">
        <Text className="text-sm text-gray-400">事绩通 v2.0.0</Text>
      </View>
    </View>
  );
}
