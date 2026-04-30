import { View, Text, Image, Input, Button } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { isWeworkSync } from '@/utils/env';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import WxIcon from '@/components/wx-icon';

export default function Profile() {
  const { openid, logout, userInfo, hasFeature } = useUserStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname, setNickname] = useState('微信用户');
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'personal' | 'enterprise'>('personal');

  useEffect(() => {
    loadUserInfo();
    const storedViewMode = Taro.getStorageSync('view_mode');
    if (storedViewMode) {
      setViewMode(storedViewMode);
    }
  }, []);

  const loadUserInfo = () => {
    const storeUserInfo = useUserStore.getState().userInfo;
    if (storeUserInfo) {
      setAvatarUrl(storeUserInfo.avatarUrl || '');
      setNickname(storeUserInfo.nickName || '微信用户');
      if (storeUserInfo.user_type === 'enterprise') {
        setViewMode('enterprise');
      }
    } else {
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

  const handleViewModeChange = async (checked: boolean) => {
    const newMode = checked ? 'enterprise' : 'personal';
    Taro.showModal({
      title: checked ? '切换到企业模式' : '切换到个人模式',
      content: checked
        ? '确定要切换到企业模式吗？\n\n切换后可以体验企业微信专属功能'
        : '确定要切换到个人模式吗？',
      confirmText: '确定',
      confirmColor: '#07C160',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '切换中...' });
          try {
            const currentOpenid = useUserStore.getState().openid;
            if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP && currentOpenid) {
              await callFunction('user-update', { user_type: newMode === 'enterprise' ? 'enterprise' : 'personal' });
            }
            Taro.setStorageSync('view_mode', newMode);
            setViewMode(newMode);
            useUserStore.getState().updateUserInfo({ user_type: newMode === 'enterprise' ? 'enterprise' : 'personal' });
            Taro.hideLoading();
            Taro.showToast({ title: '切换成功', icon: 'success' });
          } catch (err) {
            Taro.hideLoading();
            Taro.showToast({ title: '切换失败', icon: 'none' });
          }
        }
      }
    });
  };

  const onChooseAvatar = async (e: any) => {
    const { avatarUrl: newAvatarUrl } = e.detail;
    if (newAvatarUrl) {
      Taro.showLoading({ title: '上传中...' });
      try {
        setAvatarUrl(newAvatarUrl);
        await updateUserInfo({ avatarUrl: newAvatarUrl });
        Taro.hideLoading();
        Taro.showToast({ title: '头像已更新', icon: 'success' });
      } catch (err) {
        Taro.hideLoading();
        Taro.showToast({ title: '上传失败', icon: 'none' });
      }
    }
  };

  const startEditNickname = () => {
    setEditNickname(nickname);
    setIsEditing(true);
  };

  const saveNickname = async () => {
    if (!editNickname.trim()) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      setNickname(editNickname);
      await updateUserInfo({ nickName: editNickname });
      setIsEditing(false);
      Taro.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditNickname('');
  };

  const updateUserInfo = async (info: { nickName?: string; avatarUrl?: string }) => {
    const currentOpenid = useUserStore.getState().openid || Taro.getStorageSync('openid');
    const currentUserInfo = useUserStore.getState().userInfo || Taro.getStorageSync('userInfo');
    if (!currentOpenid || !currentUserInfo) {
      throw new Error('请先登录');
    }
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const res = await callFunction<CloudResponse<{}>>('user-update', {
        nickname: info.nickName,
        avatar_url: info.avatarUrl
      });
      if (!res.success) {
        throw new Error(res.message || '更新失败');
      }
    }
    const storedUserInfo = Taro.getStorageSync('userInfo');
    if (!storedUserInfo) {
      throw new Error('用户信息不存在');
    }
    const newUserInfo = { ...storedUserInfo, ...info };
    Taro.setStorageSync('userInfo', newUserInfo);
    useUserStore.setState({ userInfo: newUserInfo as any });
  };

  const navigateTo = (path: string) => {
    const tabBarPages = ['/pages/index/index', '/pages/team/index', '/pages/profile/index'];
    if (tabBarPages.includes(path)) {
      Taro.switchTab({ url: path });
    } else {
      Taro.navigateTo({ url: path });
    }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#FA5151',
      success: (res) => {
        if (res.confirm) {
          logout();
          Taro.removeStorageSync('userInfo');
          Taro.redirectTo({ url: '/pages/login/index' });
        }
      }
    });
  };

  const handleClearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？\n\n您的数据已安全存储在云端，清除后重新登录即可恢复。',
      confirmText: '确定',
      confirmColor: '#FA5151',
      success: (res) => {
        if (res.confirm) {
          const currentOpenid = useUserStore.getState().openid;
          const token = Taro.getStorageSync('token');
          Taro.clearStorageSync();
          if (currentOpenid) {
            useUserStore.setState({ openid: currentOpenid });
          }
          if (token) {
            Taro.setStorageSync('token', token);
          }
          Taro.showToast({ title: '缓存已清除', icon: 'success' });
          setTimeout(() => {
            Taro.reLaunch({ url: '/pages/index/index' });
          }, 1500);
        }
      }
    });
  };

  return (
    <View className="min-h-screen bg-gray-100 flex flex-col">
      {/* 用户信息头部 - 放大 */}
      <View className="bg-white px-6 pt-6 pb-6">
        <View className="flex items-center">
          <Button
            className="bg-transparent p-0 border-0 mr-5"
            openType="chooseAvatar"
            onChooseAvatar={onChooseAvatar}
          >
            {avatarUrl ? (
              <Image
                className="w-20 h-20 rounded-full"
                src={avatarUrl}
                mode="aspectFill"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <WxIcon name="user" size={40} color="#999" />
              </View>
            )}
          </Button>
          
          <View className="flex-1">
            {isEditing ? (
              <View className="flex items-center gap-2">
                <Input
                  className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-base border border-gray-200"
                  type="nickname"
                  placeholder="输入昵称"
                  value={editNickname}
                  onInput={(e) => setEditNickname(e.detail.value)}
                />
                <View 
                  className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                  onClick={saveNickname}
                >
                  <WxIcon name="check" size={18} color="#fff" />
                </View>
                <View 
                  className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                  onClick={cancelEdit}
                >
                  <WxIcon name="close" size={18} color="#666" />
                </View>
              </View>
            ) : (
              <View className="flex items-center" onClick={startEditNickname}>
                <Text className="text-xl font-semibold text-gray-800">{nickname}</Text>
                <WxIcon name="pencil" size={16} color="#999" style={{ marginLeft: 10 }} />
              </View>
            )}
            {openid && (
              <Text className="text-sm text-gray-500 mt-2">
                微信号: {openid.slice(-8)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 功能区域 - 均匀分布 */}
      <View className="flex-1 px-4 py-4">
        {/* 功能服务 */}
        <View className="bg-white rounded-xl overflow-hidden mb-4">
          <View 
            className="flex items-center justify-between px-5 py-4 active:bg-gray-50 border-b border-gray-100"
            onClick={() => navigateTo('/pages/history/index')}
          >
            <View className="flex items-center">
              <WxIcon name="task" size={22} color="#333" />
              <Text className="text-base text-gray-800 ml-4">我的任务</Text>
            </View>
            <WxIcon name="chevron-right" size={18} color="#C8C8C8" />
          </View>
          
          <View 
            className="flex items-center justify-between px-5 py-4 active:bg-gray-50 border-b border-gray-100"
            onClick={() => navigateTo('/pages/weekly/index')}
          >
            <View className="flex items-center">
              <WxIcon name="clipboard" size={22} color="#333" />
              <Text className="text-base text-gray-800 ml-4">数据周报</Text>
            </View>
            <WxIcon name="chevron-right" size={18} color="#C8C8C8" />
          </View>
          
          <View 
            className="flex items-center justify-between px-5 py-4 active:bg-gray-50"
            onClick={() => navigateTo('/pages/stats/index')}
          >
            <View className="flex items-center">
              <WxIcon name="chart" size={22} color="#333" />
              <Text className="text-base text-gray-800 ml-4">数据统计</Text>
            </View>
            <WxIcon name="chevron-right" size={18} color="#C8C8C8" />
          </View>
        </View>

        {/* 企业功能 */}
        {isWeworkSync() && (
          <View className="bg-white rounded-xl overflow-hidden mb-4">
            <View className="flex items-center justify-between px-5 py-4">
              <View className="flex items-center">
                <WxIcon name="building" size={22} color="#333" />
                <Text className="text-base text-gray-800 ml-4">企业模式</Text>
              </View>
              <View 
                className={`w-12 h-7 rounded-full flex items-center px-0.5 ${
                  viewMode === 'enterprise' ? 'bg-green-500' : 'bg-gray-300'
                }`}
                onClick={() => handleViewModeChange(viewMode !== 'enterprise')}
              >
                <View 
                  className={`w-6 h-6 rounded-full bg-white shadow ${
                    viewMode === 'enterprise' ? 'ml-auto' : 'ml-0'
                  }`}
                />
              </View>
            </View>
          </View>
        )}

        {/* 管理功能 */}
        {hasFeature('config_access') && (
          <View className="bg-white rounded-xl overflow-hidden mb-4">
            <View 
              className="flex items-center justify-between px-5 py-4 active:bg-gray-50 border-b border-gray-100"
              onClick={() => navigateTo('/pages/admin/index')}
            >
              <View className="flex items-center">
                <WxIcon name="shield" size={22} color="#333" />
                <Text className="text-base text-gray-800 ml-4">管理控制台</Text>
              </View>
              <WxIcon name="chevron-right" size={18} color="#C8C8C8" />
            </View>
            
            <View 
              className="flex items-center justify-between px-5 py-4 active:bg-gray-50"
              onClick={() => navigateTo('/pages/config-admin/index')}
            >
              <View className="flex items-center">
                <WxIcon name="setting" size={22} color="#333" />
                <Text className="text-base text-gray-800 ml-4">配置管理</Text>
              </View>
              <WxIcon name="chevron-right" size={18} color="#C8C8C8" />
            </View>
          </View>
        )}

        {/* 设置 */}
        <View className="bg-white rounded-xl overflow-hidden mb-4">
          <View 
            className="flex items-center justify-between px-5 py-4 active:bg-gray-50 border-b border-gray-100"
            onClick={() => navigateTo('/pages/settings/index')}
          >
            <View className="flex items-center">
              <WxIcon name="setting" size={22} color="#333" />
              <Text className="text-base text-gray-800 ml-4">设置</Text>
            </View>
            <WxIcon name="chevron-right" size={18} color="#C8C8C8" />
          </View>
          
          <View 
            className="flex items-center justify-between px-5 py-4 active:bg-gray-50"
            onClick={handleClearCache}
          >
            <View className="flex items-center">
              <WxIcon name="refresh" size={22} color="#333" />
              <Text className="text-base text-gray-800 ml-4">清除缓存</Text>
            </View>
            <WxIcon name="chevron-right" size={18} color="#C8C8C8" />
          </View>
        </View>
      </View>

      {/* 退出登录 - 页面底部 */}
      <View className="px-4 pb-6">
        <View 
          className="flex items-center justify-center py-4 bg-white rounded-xl active:bg-gray-50"
          onClick={handleLogout}
        >
          <WxIcon name="logout" size={20} color="#FA5151" />
          <Text className="text-base text-red-500 ml-2">退出登录</Text>
        </View>
      </View>
    </View>
  );
}
