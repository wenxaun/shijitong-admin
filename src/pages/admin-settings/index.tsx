import { View, Text, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, TriangleAlert, RefreshCw } from 'lucide-react-taro';

export default function AdminSettingsPage() {
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [showClearUserDataDialog, setShowClearUserDataDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');

  const handleClearAllData = () => {
    setShowClearAllDialog(true);
  };

  const confirmClearAllData = async () => {
    setActionLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ success: boolean }>>('admin-clear-all-data', {});

      if (res.success) {
        Taro.showToast({ title: '清除成功', icon: 'success' });
        setShowClearAllDialog(false);
        // 延迟跳转到登录页
        setTimeout(() => {
          Taro.reLaunch({ url: '/pages/login/index' });
        }, 1500);
      } else {
        Taro.showToast({ title: res.message || '清除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('[AdminSettings] 清除数据失败:', error);
      Taro.showToast({ title: '清除失败', icon: 'none' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearUserData = () => {
    setTargetUserId('');
    setShowClearUserDataDialog(true);
  };

  const confirmClearUserData = async () => {
    if (!targetUserId.trim()) {
      Taro.showToast({ title: '请输入用户ID', icon: 'none' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ success: boolean }>>('admin-clear-user-data', {
        target_openid: targetUserId.trim()
      });

      if (res.success) {
        Taro.showToast({ title: '清除成功', icon: 'success' });
        setShowClearUserDataDialog(false);
        setTargetUserId('');
      } else {
        Taro.showToast({ title: res.message || '清除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('[AdminSettings] 清除用户数据失败:', error);
      Taro.showToast({ title: '清除失败', icon: 'none' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      <View className="p-4">
        {/* 提示信息 */}
        <Card className="mb-4 bg-orange-50">
          <CardContent className="p-4">
            <View className="flex items-start gap-3">
              <TriangleAlert size={24} color="#F59E0B" className="flex-shrink-0 mt-1" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-orange-800 mb-1">危险操作</Text>
                <Text className="text-xs text-orange-600 leading-relaxed">
                  以下操作将永久删除数据，请谨慎操作。建议在执行前备份数据。
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 数据管理 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">数据管理</Text>

            {/* 清除所有数据 */}
            <View className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <View className="flex items-center gap-3 mb-3">
                <Trash2 size={20} color="#EF4444" />
                <Text className="text-base font-medium text-red-800">清除所有数据</Text>
              </View>
              <Text className="text-xs text-red-600 mb-3 leading-relaxed">
                此操作将删除数据库中的所有数据，包括所有用户、任务、分组等信息。操作后需要重新初始化系统。
              </Text>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleClearAllData}
              >
                <RefreshCw size={16} color="#FFFFFF" className="mr-2" />
                清除所有数据
              </Button>
            </View>

            {/* 清除指定用户数据 */}
            <View className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <View className="flex items-center gap-3 mb-3">
                <Trash2 size={20} color="#F59E0B" />
                <Text className="text-base font-medium text-orange-800">清除用户数据</Text>
              </View>
              <Text className="text-xs text-orange-600 mb-3 leading-relaxed">
                清除指定用户的所有数据（任务、分组、历史记录等），但保留用户账号信息。
              </Text>
              <Button
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={handleClearUserData}
              >
                <Trash2 size={16} color="#F59E0B" className="mr-2" />
                清除用户数据
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* 系统信息 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <Text className="text-base font-semibold text-gray-800 mb-3">系统信息</Text>

            <View className="space-y-2">
              <View className="flex justify-between">
                <Text className="text-sm text-gray-500">当前用户</Text>
                <Text className="text-sm text-gray-700">{useUserStore.getState().userInfo?.nickName || '未知'}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-sm text-gray-500">用户角色</Text>
                <Text className="text-sm text-gray-700">{useUserStore.getState().userInfo?.role || 'member'}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-sm text-gray-500">用户类型</Text>
                <Text className="text-sm text-gray-700">
                  {useUserStore.getState().userInfo?.user_type === 'enterprise' ? '企业用户' : '个人用户'}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <View className="py-4 text-center">
          <Text className="text-xs text-gray-400">管理控制台 v1.0</Text>
        </View>
      </View>

      {/* 清除所有数据确认对话框 */}
      <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ 危险操作</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-gray-700 mb-3 font-medium">
              确定要清除所有数据吗？
            </Text>
            <View className="bg-red-50 rounded-lg p-3 mb-3">
              <Text className="text-xs text-red-600 leading-relaxed">
                此操作将永久删除以下内容：
              </Text>
              <View className="mt-2 space-y-2">
                <Text className="text-xs text-red-600">• 所有用户数据</Text>
                <Text className="text-xs text-red-600">• 所有任务记录</Text>
                <Text className="text-xs text-red-600">• 所有分组信息</Text>
                <Text className="text-xs text-red-600">• 所有历史记录</Text>
                <Text className="text-xs text-red-600">• 所有企业信息</Text>
              </View>
            </View>
            <Text className="text-sm text-red-600 font-medium">
              此操作无法恢复！请再次确认。
            </Text>
          </View>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearAllDialog(false)}
              disabled={actionLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearAllData}
              disabled={actionLoading}
            >
              {actionLoading ? '清除中...' : '确认清除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清除用户数据对话框 */}
      <Dialog open={showClearUserDataDialog} onOpenChange={setShowClearUserDataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清除用户数据</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-gray-700 mb-3">
              请输入要清除数据的用户ID（openid）：
            </Text>
            <View className="bg-gray-50 rounded-lg p-3 mb-3">
              <Text
                className="text-sm text-gray-600 mb-2 block"
              >
                用户ID:
              </Text>
              <View className="bg-white rounded px-3 py-2 border border-gray-200">
                <input
                  type="text"
                  className="w-full text-sm outline-none"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="输入openid"
                />
              </View>
            </View>
            <Text className="text-xs text-orange-600">
              提示：可在用户管理页面查看用户ID
            </Text>
          </View>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearUserDataDialog(false)}
              disabled={actionLoading}
            >
              取消
            </Button>
            <Button
              onClick={confirmClearUserData}
              disabled={actionLoading}
            >
              {actionLoading ? '清除中...' : '确认清除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}
