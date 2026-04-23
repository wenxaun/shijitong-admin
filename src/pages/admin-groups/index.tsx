import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse, TaskGroup } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader, FolderKanban, Trash2 } from 'lucide-react-taro';

export default function AdminGroupsPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ groups: TaskGroup[] }>>('group-list', {});

      if (res.success && res.data) {
        setGroups(res.data.groups || []);
      }
    } catch (error) {
      console.error('[AdminGroups] 加载分组失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = (group: TaskGroup) => {
    setSelectedGroup(group);
    setShowDeleteDialog(true);
  };

  const confirmDeleteGroup = async () => {
    if (!selectedGroup) return;

    setActionLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ success: boolean }>>('group-delete', {
        group_id: selectedGroup._id
      });

      if (res.success) {
        Taro.showToast({ title: '删除成功', icon: 'success' });
        setShowDeleteDialog(false);
        loadGroups();
      } else {
        Taro.showToast({ title: res.message || '删除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('[AdminGroups] 删除分组失败:', error);
      Taro.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      setActionLoading(false);
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
        <Card className="mb-4">
          <CardContent className="p-4 text-center">
            <Text className="text-3xl font-bold text-blue-600">{groups.length}</Text>
            <Text className="text-sm text-gray-500 block mt-1">总分组数</Text>
          </CardContent>
        </Card>

        {/* 分组列表 */}
        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderKanban size={48} color="#D1D5DB" className="mx-auto mb-3" />
              <Text className="text-gray-500">暂无分组</Text>
            </CardContent>
          </Card>
        ) : (
          groups.map(group => (
            <Card key={group._id} className="mb-3">
              <CardContent className="p-4">
                <View className="flex items-center justify-between gap-3">
                  {/* 分组信息 */}
                  <View className="flex-1">
                    <View className="flex items-center gap-2 mb-2">
                      <Text className="text-base font-medium text-gray-900">
                        {group.name}
                      </Text>
                      {group.task_count !== undefined && (
                        <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-600">
                          {group.task_count} 个任务
                        </Badge>
                      )}
                    </View>

                    <View className="flex items-center gap-2">
                      <Text className="text-xs text-gray-400">
                        ID: {group._id.slice(-8)}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        排序: {group.order}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 操作按钮 */}
                <View className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => handleDeleteGroup(group)}
                  >
                    <Trash2 size={14} color="#EF4444" className="mr-1" />
                    删除
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))
        )}

        {/* 底部提示 */}
        <View className="py-4 text-center">
          <Text className="text-xs text-gray-400">共 {groups.length} 个分组</Text>
        </View>
      </View>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除分组</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-gray-700 mb-2">
              确定要删除分组「{selectedGroup?.name}」吗？
            </Text>
            <Text className="text-sm text-red-500">
              分组内的任务不会被删除，但会失去分组关联。
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
              onClick={confirmDeleteGroup}
              disabled={actionLoading}
            >
              {actionLoading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}
