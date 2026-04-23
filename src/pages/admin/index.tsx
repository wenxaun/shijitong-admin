import { View, Text, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ClipboardList, FolderKanban, Settings } from 'lucide-react-taro';

export default function AdminPage() {
  const { userInfo } = useUserStore();
  const [loading, setLoading] = useState(false);

  // 检查是否是管理员
  const isAdmin = userInfo?.role === 'admin' || userInfo?.role === 'owner';

  const navigateTo = (url: string) => {
    Taro.navigateTo({ url });
  };

  const handleUserManagement = () => {
    if (!isAdmin) {
      Taro.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    navigateTo('/pages/admin-users/index');
  };

  const handleTaskManagement = () => {
    if (!isAdmin) {
      Taro.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    navigateTo('/pages/admin-tasks/index');
  };

  const handleGroupManagement = () => {
    if (!isAdmin) {
      Taro.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    navigateTo('/pages/admin-groups/index');
  };

  const handleSettings = () => {
    if (!isAdmin) {
      Taro.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    navigateTo('/pages/admin-settings/index');
  };

  if (!isAdmin) {
    return (
      <View className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8">
        <View className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Settings size={32} color="#EF4444" />
        </View>
        <Text className="text-lg text-gray-700 font-medium mb-2">无权访问</Text>
        <Text className="text-sm text-gray-400 text-center mb-6">
          您需要管理员权限才能访问此页面
        </Text>
        <Button
          className="w-full max-w-xs"
          variant="outline"
          onClick={() => Taro.navigateBack()}
        >
          返回
        </Button>
      </View>
    );
  }

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      <View className="p-4">
        {/* 欢迎卡片 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <Text className="text-xl font-bold text-gray-800 mb-1">管理控制台</Text>
            <Text className="text-sm text-gray-500">管理系统用户、任务和分组</Text>
          </CardContent>
        </Card>

        {/* 用户管理 */}
        <Card className="mb-3">
          <CardContent className="p-4">
            <View
              className="flex items-center active:bg-gray-50 rounded-lg -m-4 p-4"
              onClick={handleUserManagement}
            >
              <View className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-3">
                <Users size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium">用户管理</Text>
                <Text className="text-xs text-gray-400 mt-1">管理系统用户和权限</Text>
              </View>
              <Text className="text-gray-300">›</Text>
            </View>
          </CardContent>
        </Card>

        {/* 任务管理 */}
        <Card className="mb-3">
          <CardContent className="p-4">
            <View
              className="flex items-center active:bg-gray-50 rounded-lg -m-4 p-4"
              onClick={handleTaskManagement}
            >
              <View className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-3">
                <ClipboardList size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium">任务管理</Text>
                <Text className="text-xs text-gray-400 mt-1">查看和管理所有任务</Text>
              </View>
              <Text className="text-gray-300">›</Text>
            </View>
          </CardContent>
        </Card>

        {/* 分组管理 */}
        <Card className="mb-3">
          <CardContent className="p-4">
            <View
              className="flex items-center active:bg-gray-50 rounded-lg -m-4 p-4"
              onClick={handleGroupManagement}
            >
              <View className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mr-3">
                <FolderKanban size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium">分组管理</Text>
                <Text className="text-xs text-gray-400 mt-1">管理系统任务分组</Text>
              </View>
              <Text className="text-gray-300">›</Text>
            </View>
          </CardContent>
        </Card>

        {/* 系统设置 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <View
              className="flex items-center active:bg-gray-50 rounded-lg -m-4 p-4"
              onClick={handleSettings}
            >
              <View className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mr-3">
                <Settings size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium">系统设置</Text>
                <Text className="text-xs text-gray-400 mt-1">设定汇报格式和系统参数</Text>
              </View>
              <Text className="text-gray-300">›</Text>
            </View>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <View className="py-4 text-center">
          <Text className="text-xs text-gray-400">管理员控制台</Text>
        </View>
      </View>
    </ScrollView>
  );
}
