import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader, Shield, User, UserMinus } from 'lucide-react-taro';

interface UserInfo {
  openid: string;
  nickname: string;
  avatar_url?: string;
  user_type: 'personal' | 'enterprise';
  role: 'member' | 'admin' | 'owner';
  created_at: string;
  corp_id?: string;
}

export default function AdminUsersPage() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSetAdminDialog, setShowSetAdminDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ users: UserInfo[] }>>('user-list-for-manager', {});
      if (res.success && res.data) {
        setUsers(res.data.users || []);
      }
    } catch (error) {
      console.error('[AdminUsers] 加载用户失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user: UserInfo) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleSetAdmin = (user: UserInfo) => {
    setSelectedUser(user);
    setShowSetAdminDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ success: boolean }>>('admin-delete-user', {
        target_openid: selectedUser.openid
      });

      if (res.success) {
        Taro.showToast({ title: '删除成功', icon: 'success' });
        setShowDeleteDialog(false);
        loadUsers();
      } else {
        Taro.showToast({ title: res.message || '删除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('[AdminUsers] 删除用户失败:', error);
      Taro.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmSetAdmin = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ success: boolean }>>('user-set-manager', {
        openid: selectedUser.openid,
        role: 'admin'
      });

      if (res.success) {
        Taro.showToast({ title: '设置成功', icon: 'success' });
        setShowSetAdminDialog(false);
        loadUsers();
      } else {
        Taro.showToast({ title: res.message || '设置失败', icon: 'none' });
      }
    } catch (error) {
      console.error('[AdminUsers] 设置管理员失败:', error);
      Taro.showToast({ title: '设置失败', icon: 'none' });
    } finally {
      setActionLoading(false);
    }
  };

  const getUserTypeLabel = (type: string) => {
    return type === 'enterprise' ? '企业用户' : '个人用户';
  };

  const getUserTypeColor = (type: string) => {
    return type === 'enterprise' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return '超级管理员';
      case 'admin':
        return '管理员';
      default:
        return '普通成员';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-red-100 text-red-600';
      case 'admin':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size={32} color="#1377EB" className="animate-spin" />
      </View>
    );
  }

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      <View className="p-4">
        {/* 统计信息 */}
        <View className="flex gap-3 mb-4">
          <Card className="flex-1">
            <CardContent className="p-3 text-center">
              <Text className="text-2xl font-bold text-blue-600">{users.length}</Text>
              <Text className="text-xs text-gray-500 block mt-1">总用户数</Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3 text-center">
              <Text className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.user_type === 'enterprise').length}
              </Text>
              <Text className="text-xs text-gray-500 block mt-1">企业用户</Text>
            </CardContent>
          </Card>
        </View>

        {/* 用户列表 */}
        {users.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <User size={48} color="#D1D5DB" className="mx-auto mb-3" />
              <Text className="text-gray-500">暂无用户</Text>
            </CardContent>
          </Card>
        ) : (
          users.map(user => (
            <Card key={user.openid} className="mb-3">
              <CardContent className="p-4">
                <View className="flex items-start gap-3">
                  {/* 用户头像 */}
                  <View className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Text className="text-white text-lg font-medium">
                      {user.nickname?.[0] || '用'}
                    </Text>
                  </View>

                  {/* 用户信息 */}
                  <View className="flex-1 min-w-0">
                    <View className="flex items-center gap-2 mb-2">
                      <Text className="text-base font-medium text-gray-900 truncate">
                        {user.nickname || '未知用户'}
                      </Text>
                      <Text className={`px-2 py-1 rounded text-xs ${getUserTypeColor(user.user_type)}`}>
                        {getUserTypeLabel(user.user_type)}
                      </Text>
                      <Text className={`px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </Text>
                    </View>
                    <View className="flex flex-wrap gap-2">
                      <Text className="text-xs text-gray-400">
                        ID: {user.openid.slice(-8)}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 操作按钮 */}
                {user.openid !== openid && (
                  <View className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleSetAdmin(user)}
                    >
                      <Shield size={14} color="#1377EB" className="mr-1" />
                      设管理员
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 text-xs"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <UserMinus size={14} color="#EF4444" className="mr-1" />
                      删除用户
                    </Button>
                  </View>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {/* 底部提示 */}
        <View className="py-4 text-center">
          <Text className="text-xs text-gray-400">共 {users.length} 位用户</Text>
        </View>
      </View>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-gray-700 mb-2">
              确定要删除用户「{selectedUser?.nickname}」吗？
            </Text>
            <Text className="text-sm text-red-500">
              此操作将删除该用户的所有数据（任务、分组等），且无法恢复。
            </Text>
          </View>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={actionLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={actionLoading}
            >
              {actionLoading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 设置管理员确认对话框 */}
      <Dialog open={showSetAdminDialog} onOpenChange={setShowSetAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置管理员</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-gray-700">
              确定要将「{selectedUser?.nickname}」设置为管理员吗？
            </Text>
          </View>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSetAdminDialog(false)}
              disabled={actionLoading}
            >
              取消
            </Button>
            <Button
              onClick={confirmSetAdmin}
              disabled={actionLoading}
            >
              {actionLoading ? '设置中...' : '确认设置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}
