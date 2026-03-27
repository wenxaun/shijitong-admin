import { View, Text, Image } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// 菜单项配置
const MENU_ITEMS = [
  { icon: '📜', label: '历史任务', path: '/pages/history/index' },
  { icon: '📊', label: '周报', path: '/pages/weekly/index' },
  { icon: '📈', label: '数据统计', path: '/pages/stats/index' },
  { icon: '⚙️', label: '提醒设置', path: '/pages/settings/index' },
  { icon: '👥', label: '我的团队', path: '/pages/team/index' }
];

// 信息项配置
const INFO_ITEMS = [
  { icon: '☁️', label: '云环境 ID', value: 'cloud1-3g7j95ax4a0f4a3f' },
  { icon: '📱', label: '小程序 AppID', value: 'wx2be578f65935b5e8' }
];

export default function Profile() {
  const { openid, logout } = useUserStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname, setNickname] = useState('微信用户');

  useEffect(() => {
    // 从本地存储获取用户信息
    const storedUserInfo = Taro.getStorageSync('userInfo');
    if (storedUserInfo) {
      setAvatarUrl(storedUserInfo.avatarUrl || '');
      setNickname(storedUserInfo.nickName || '微信用户');
    }
  }, []);

  // 跳转页面
  const navigateTo = (path: string) => {
    Taro.navigateTo({ url: path });
  };

  // 复制文本
  const copyText = (text: string) => {
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success' });
      }
    });
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
          <View className="ml-4">
            <Text className="text-xl text-white font-semibold">{nickname}</Text>
            {openid && (
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
                  <Text className="text-gray-400">›</Text>
                </View>
                {index < MENU_ITEMS.length - 1 && <Separator className="mx-4" />}
              </View>
            ))}
          </CardContent>
        </Card>
      </View>

      {/* 信息卡片 */}
      <View className="px-3 py-2">
        <Text className="text-sm text-gray-500 mb-2 px-1">信息</Text>
        <Card>
          <CardContent className="p-0">
            {INFO_ITEMS.map((item, index) => (
              <View key={item.label}>
                <View
                  className="flex items-center justify-between px-4 py-3 active:bg-gray-50"
                  onClick={() => copyText(item.value)}
                >
                  <View className="flex items-center">
                    <Text className="text-xl mr-3">{item.icon}</Text>
                    <Text className="text-base text-gray-800">{item.label}</Text>
                  </View>
                  <View className="flex items-center">
                    <Text className="text-sm text-gray-400 mr-2">{item.value}</Text>
                    <Text className="text-gray-400">›</Text>
                  </View>
                </View>
                {index < INFO_ITEMS.length - 1 && <Separator className="mx-4" />}
              </View>
            ))}
          </CardContent>
        </Card>
      </View>

      {/* 退出登录 */}
      {openid && (
        <View className="px-3 py-4">
          <Button
            variant="outline"
            className="w-full text-gray-600"
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </View>
      )}

      {/* 版本信息 */}
      <View className="flex justify-center py-6">
        <Text className="text-sm text-gray-400">事绩通 v2.0.0</Text>
      </View>
    </View>
  );
}
