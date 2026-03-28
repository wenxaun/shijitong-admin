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
import { Camera, ChevronRight, LogOut, Trash2, Pencil, Check, X } from 'lucide-react-taro';

// 菜单项配置 - 按指定顺序排列
const MENU_ITEMS = [
  { icon: '👥', label: '我的团队', path: '/pages/team/index' },
  { icon: '📈', label: '数据统计', path: '/pages/stats/index' },
  { icon: '📜', label: '历史任务', path: '/pages/history/index' },
  { icon: '⚙️', label: '提醒设置', path: '/pages/settings/index' },
  { icon: '📊', label: '周报', path: '/pages/weekly/index' }
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

  // 清除本地缓存
  const handleClearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？\n\n您的用户信息、任务记录、团队信息等数据已安全存储在云端，清除后重新登录即可恢复。',
      confirmText: '确定清除',
      confirmColor: '#EA4335',
      success: (res) => {
        if (res.confirm) {
          // 保留用户登录状态
          const currentOpenid = useUserStore.getState().openid;
          const token = Taro.getStorageSync('token');
          
          // 清除所有本地缓存
          Taro.clearStorageSync();
          
          // 恢复登录状态
          if (currentOpenid) {
            useUserStore.setState({ openid: currentOpenid });
          }
          if (token) {
            Taro.setStorageSync('token', token);
          }
          
          Taro.showToast({ 
            title: '缓存已清除', 
            icon: 'success',
            duration: 2000
          });
          
          // 2秒后刷新页面
          setTimeout(() => {
            Taro.reLaunch({ url: '/pages/index/index' });
          }, 2000);
        }
      }
    });
  };

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 用户信息卡片 */}
      <View className="px-4 pt-6 pb-4">
        <Card className="overflow-hidden">
          <View className="bg-gradient-to-r from-blue-500 to-blue-600 h-24" />
          <CardContent className="p-0">
            <View className="flex flex-col items-center -mt-12 pb-4">
              {/* 头像 */}
              <Button
                className="bg-transparent p-0 border-0 relative"
                openType="chooseAvatar"
                onChooseAvatar={onChooseAvatar}
              >
                {avatarUrl ? (
                  <Image
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                    src={avatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                    <Text className="text-3xl text-white font-bold">
                      {nickname ? nickname[0] : '我'}
                    </Text>
                  </View>
                )}
                {/* 编辑图标 */}
                <View className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100">
                  <Camera size={16} color="#1377EB" />
                </View>
              </Button>
              
              {/* 昵称 */}
              <View className="mt-3 flex items-center gap-2">
                {isEditing ? (
                  <View className="flex items-center gap-2">
                    <Input
                      className="bg-gray-50 rounded-lg px-3 py-1 text-base text-gray-800 border border-gray-200"
                      type="nickname"
                      placeholder="输入昵称"
                      value={editNickname}
                      onInput={(e) => setEditNickname(e.detail.value)}
                    />
                    <View 
                      className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
                      onClick={saveNickname}
                    >
                      {saving ? (
                        <Text className="text-white text-xs">...</Text>
                      ) : (
                        <Check size={16} color="#ffffff" />
                      )}
                    </View>
                    <View 
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                      onClick={cancelEdit}
                    >
                      <X size={16} color="#6B7280" />
                    </View>
                  </View>
                ) : (
                  <View className="flex items-center gap-2" onClick={startEditNickname}>
                    <Text className="text-lg text-gray-800 font-semibold">{nickname}</Text>
                    <Pencil size={14} color="#9CA3AF" />
                  </View>
                )}
              </View>
              
              {/* 用户ID */}
              {openid && (
                <Text className="text-xs text-gray-400 mt-1">
                  ID: {openid.slice(-8)}
                </Text>
              )}
            </View>
          </CardContent>
        </Card>
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
          <Card>
            <CardContent className="p-0">
              <View
                className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                onClick={handleClearCache}
              >
                <View className="flex items-center">
                  <Trash2 size={18} color="#6B7280" />
                  <Text className="text-base text-gray-600 ml-3">清除本地缓存</Text>
                </View>
                <ChevronRight size={20} color="#D1D5DB" />
              </View>
            </CardContent>
          </Card>
          
          <UIButton
            variant="outline"
            className="w-full text-gray-600 mt-4"
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
