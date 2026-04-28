// 注意：头像选择和昵称输入必须使用 Taro 原生组件，因为需要 openType="chooseAvatar" 和 type="nickname"
// eslint-disable-next-line no-restricted-syntax
import { View, Text, Image, Input, Button } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { isWeworkSync } from '@/utils/env';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse, MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button as UIButton } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Camera, ChevronRight, LogOut, Trash2, Pencil, Check, X, Shield, Building } from 'lucide-react-taro';
import { Switch } from '@/components/ui/switch';

// 默认菜单项配置（不包含功能排序，功能排序放在设置页面）
const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { icon: '📈', label: '数据统计', path: '/pages/stats/index', order: 1 },
  { icon: '📜', label: '历史待办', path: '/pages/history/index', order: 2 },
  { icon: '📊', label: '周报', path: '/pages/weekly/index', order: 3 },
  { icon: '⚙️', label: '设置', path: '/pages/settings/index', order: 4 }
];

export default function Profile() {
  const { openid, logout, userInfo } = useUserStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname, setNickname] = useState('微信用户');
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [viewMode, setViewMode] = useState<'personal' | 'enterprise'>('personal');

  // 调试信息
  console.log('[Profile] 渲染时的状态:', {
    isWework: isWeworkSync(),
    userInfo,
    user_type: userInfo?.user_type,
    shouldShowSwitchButton: (!userInfo?.user_type || userInfo?.user_type === 'personal') && isWeworkSync()
  });

  useEffect(() => {
    loadUserInfo();
    loadMenuOrder();
    // 加载视图模式
    const storedViewMode = Taro.getStorageSync('view_mode');
    if (storedViewMode) {
      setViewMode(storedViewMode);
    }
  }, []);

  // 页面显示时重新加载菜单排序
  Taro.useDidShow(() => {
    loadMenuOrder();
  });

  // 加载菜单排序
  const loadMenuOrder = () => {
    const storedOrder = Taro.getStorageSync('menu_order');
    if (storedOrder) {
      const orderMap = new Map<string, number>(storedOrder.map((item: { path: string; order: number }) => [item.path, item.order]));
      const sortedItems = [...DEFAULT_MENU_ITEMS].sort((a, b) => {
        const orderA: number = orderMap.get(a.path) ?? a.order ?? 0;
        const orderB: number = orderMap.get(b.path) ?? b.order ?? 0;
        return orderA - orderB;
      });
      setMenuItems(sortedItems);
    } else {
      setMenuItems(DEFAULT_MENU_ITEMS);
    }
  };

  // 加载用户信息
  const loadUserInfo = () => {
    // 从 store 获取
    const storeUserInfo = useUserStore.getState().userInfo;
    if (storeUserInfo) {
      setAvatarUrl(storeUserInfo.avatarUrl || '');
      setNickname(storeUserInfo.nickName || '微信用户');
      // 根据用户类型设置视图模式
      if (storeUserInfo.user_type === 'enterprise') {
        setViewMode('enterprise');
      }
    } else {
      // 从本地存储获取
      const storedUserInfo = Taro.getStorageSync('userInfo');
      if (storedUserInfo) {
        setAvatarUrl(storedUserInfo.avatarUrl || '');
        setNickname(storedUserInfo.nickName || '微信用户');
        if (storedUserInfo.user_type === 'enterprise') {
          setViewMode('enterprise');
        }
      }
    }
  };

  // 切换企业模式（同时切换用户类型和视图模式）
  const handleViewModeChange = async (checked: boolean) => {
    const newMode = checked ? 'enterprise' : 'personal';

    Taro.showModal({
      title: checked ? '切换到企业模式' : '切换到个人模式',
      content: checked
        ? '确定要切换到企业模式吗？\n\n切换后可以体验企业微信专属功能：\n• 企业组织架构查看\n• 企业成员选择\n• 任务流转和审批'
        : '确定要切换到个人模式吗？\n\n切换后将返回个人视图，企业功能将不可用。',
      confirmText: '确定切换',
      confirmColor: '#1377EB',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '切换中...' });

          try {
            const currentUserInfo = useUserStore.getState().userInfo;
            if (!currentUserInfo) {
              Taro.hideLoading();
              Taro.showToast({
                title: '获取用户信息失败',
                icon: 'none'
              });
              return;
            }

            // 同时更新用户类型和视图模式
            const newUserInfo = {
              ...currentUserInfo,
              user_type: newMode as 'personal' | 'enterprise'
            };

            // 更新本地存储和状态
            Taro.setStorageSync('userInfo', newUserInfo);
            useUserStore.setState({ userInfo: newUserInfo });
            setViewMode(newMode);
            Taro.setStorageSync('view_mode', newMode);

            Taro.hideLoading();

            Taro.showToast({
              title: checked ? '已切换到企业模式' : '已切换到个人模式',
              icon: 'success',
              duration: 2000
            });

            // 刷新页面以应用新的模式
            setTimeout(() => {
              Taro.reLaunch({ url: '/pages/index/index' });
            }, 1500);
          } catch (error) {
            Taro.hideLoading();
            Taro.showToast({
              title: '切换失败，请重试',
              icon: 'none',
              duration: 2000
            });
          }
        }
      }
    });
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

        {/* 企业功能 - 企业微信环境中显示 */}
        {isWeworkSync() && (
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-2 px-1">企业功能</Text>
            <Card>
              <CardContent className="p-0">
                {/* 企业模式开关 */}
                <View className="flex items-center justify-between px-4 py-3">
                  <View className="flex items-center">
                    <View className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mr-3">
                      <Building size={20} color="#ffffff" />
                    </View>
                    <View>
                      <Text className="text-base text-gray-900 block">企业模式</Text>
                      <Text className="text-xs text-gray-400">
                        {viewMode === 'enterprise' ? '已启用企业功能' : '启用企业微信功能'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    checked={viewMode === 'enterprise'}
                    onCheckedChange={handleViewModeChange}
                  />
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* 报表统计 */}
        <View className="mb-4">
          <Text className="text-sm text-gray-500 mb-2 px-1">报表统计</Text>
          <Card>
            <CardContent className="p-0">
              <View
                className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                onClick={() => navigateTo('/pages/weekly/index')}
              >
                <View className="flex items-center">
                  <Text className="text-2xl mr-2">📊</Text>
                  <Text className="text-base text-gray-800">周报统计</Text>
                </View>
                <ChevronRight size={20} color="#D1D5DB" />
              </View>
              <Separator className="mx-4" />
              <View
                className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                onClick={() => navigateTo('/pages/stats/index')}
              >
                <View className="flex items-center">
                  <Text className="text-2xl mr-2">📈</Text>
                  <Text className="text-base text-gray-800">数据统计</Text>
                </View>
                <ChevronRight size={20} color="#D1D5DB" />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* 功能快捷入口 */}
        <View className="mb-4">
          <Text className="text-sm text-gray-500 mb-2 px-1">功能</Text>
          <Card>
            <CardContent className="p-0">
              {menuItems.map((item, index) => (
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
                  {index < menuItems.length - 1 && <Separator className="mx-4" />}
                </View>
              ))}
            </CardContent>
          </Card>
        </View>

        {/* 管理功能 - 管理员可见 */}
        {(userInfo?.role === 'admin' || userInfo?.role === 'owner' || Taro.getSystemInfoSync().environment === 'wxwork') && (
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-2 px-1">管理</Text>
            <Card>
              <CardContent className="p-0">
                {/* 管理控制台 - 仅管理员可见 */}
                {userInfo?.role === 'admin' || userInfo?.role === 'owner' ? (
                  <>
                    <View
                      className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                      onClick={() => navigateTo('/pages/admin/index')}
                    >
                      <View className="flex items-center">
                        <Shield size={20} color="#1377EB" />
                        <Text className="text-base text-gray-800 ml-3">管理控制台</Text>
                      </View>
                      <ChevronRight size={20} color="#D1D5DB" />
                    </View>
                    <Separator className="mx-4" />
                  </>
                ) : null}

                {/* 配置管理 - 管理员或企业微信环境可见 */}
                {(userInfo?.role === 'admin' || userInfo?.role === 'owner' || Taro.getSystemInfoSync().environment === 'wxwork') && (
                  <View
                    className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                    onClick={() => navigateTo('/pages/config-admin/index')}
                  >
                    <View className="flex items-center">
                      <Settings size={20} color="#1377EB" />
                      <Text className="text-base text-gray-800 ml-3">配置管理</Text>
                    </View>
                    <ChevronRight size={20} color="#D1D5DB" />
                  </View>
                )}
              </CardContent>
            </Card>
          </View>
        )}

        {/* 系统设置 */}
        <View className="mb-4">
          <Text className="text-sm text-gray-500 mb-2 px-1">设置</Text>
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
        </View>
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
