import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse, TaskGroup } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2 } from 'lucide-react-taro';

export default function GroupManage() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null);
  const [inputName, setInputName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  // 加载分组列表
  const loadGroups = async () => {
    setLoading(true);
    try {
      // H5 端使用本地存储
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const storedGroups = Taro.getStorageSync('mock_groups') || '[]';
        let groupList: TaskGroup[] = JSON.parse(storedGroups);
        
        if (groupList.length === 0) {
          groupList = [
            { _id: 'default1', name: '工作', user_id: 'test', order: 1, task_count: 0, created_at: new Date().toISOString() },
            { _id: 'default2', name: '个人', user_id: 'test', order: 2, task_count: 0, created_at: new Date().toISOString() }
          ];
          Taro.setStorageSync('mock_groups', JSON.stringify(groupList));
        }
        
        // 按排序字段排序
        setGroups(groupList.sort((a, b) => a.order - b.order));
        return;
      }
      
      // 小程序端
      const res = await callFunction<CloudResponse<{ groups: TaskGroup[] }>>('group-list', {});
      if (res.success && res.data) {
        setGroups(res.data.groups || []);
      }
    } catch (err) {
      console.error('[GroupManage] 加载分组失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  // 新增分组
  const addGroup = async () => {
    if (!inputName.trim()) {
      Taro.showToast({ title: '请输入分组名称', icon: 'none' });
      return;
    }
    
    setSubmitting(true);
    try {
      // H5 端
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const newGroup: TaskGroup = {
          _id: `group_${Date.now()}`,
          name: inputName.trim(),
          user_id: openid || 'test',
          order: groups.length + 1,
          task_count: 0,
          created_at: new Date().toISOString()
        };
        const updatedGroups = [...groups, newGroup];
        Taro.setStorageSync('mock_groups', JSON.stringify(updatedGroups));
        setGroups(updatedGroups);
        setShowAddDialog(false);
        setInputName('');
        Taro.showToast({ title: '添加成功', icon: 'success' });
        return;
      }
      
      // 小程序端
      const res = await callFunction<CloudResponse<{ group: TaskGroup }>>('group-create', {
        name: inputName.trim()
      });
      
      if (res.success && res.data) {
        setGroups([...groups, res.data.group]);
        setShowAddDialog(false);
        setInputName('');
        Taro.showToast({ title: '添加成功', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '添加失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[GroupManage] 添加分组失败:', err);
      Taro.showToast({ title: '添加失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 编辑分组
  const editGroup = async () => {
    if (!inputName.trim()) {
      Taro.showToast({ title: '请输入分组名称', icon: 'none' });
      return;
    }
    if (!editingGroup) return;
    
    setSubmitting(true);
    try {
      // H5 端
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const updatedGroups = groups.map(g => 
          g._id === editingGroup._id ? { ...g, name: inputName.trim() } : g
        );
        Taro.setStorageSync('mock_groups', JSON.stringify(updatedGroups));
        setGroups(updatedGroups);
        setShowEditDialog(false);
        setEditingGroup(null);
        setInputName('');
        Taro.showToast({ title: '修改成功', icon: 'success' });
        return;
      }
      
      // 小程序端
      const res = await callFunction<CloudResponse>('group-update', {
        group_id: editingGroup._id,
        name: inputName.trim()
      });
      
      if (res.success) {
        const updatedGroups = groups.map(g => 
          g._id === editingGroup._id ? { ...g, name: inputName.trim() } : g
        );
        setGroups(updatedGroups);
        setShowEditDialog(false);
        setEditingGroup(null);
        setInputName('');
        Taro.showToast({ title: '修改成功', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '修改失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[GroupManage] 修改分组失败:', err);
      Taro.showToast({ title: '修改失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除分组
  const deleteGroup = async () => {
    if (!editingGroup) return;
    
    setSubmitting(true);
    try {
      // H5 端
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const updatedGroups = groups.filter(g => g._id !== editingGroup._id);
        Taro.setStorageSync('mock_groups', JSON.stringify(updatedGroups));
        setGroups(updatedGroups);
        setShowDeleteDialog(false);
        setEditingGroup(null);
        Taro.showToast({ title: '删除成功', icon: 'success' });
        return;
      }
      
      // 小程序端
      const res = await callFunction<CloudResponse>('group-delete', {
        group_id: editingGroup._id
      });
      
      if (res.success) {
        const updatedGroups = groups.filter(g => g._id !== editingGroup._id);
        setGroups(updatedGroups);
        setShowDeleteDialog(false);
        setEditingGroup(null);
        Taro.showToast({ title: '删除成功', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '删除失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[GroupManage] 删除分组失败:', err);
      Taro.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (group: TaskGroup) => {
    setEditingGroup(group);
    setInputName(group.name);
    setShowEditDialog(true);
  };

  // 打开删除对话框
  const openDeleteDialog = (group: TaskGroup) => {
    setEditingGroup(group);
    setShowDeleteDialog(true);
  };

  // 上移分组
  const moveUp = async (index: number) => {
    if (index === 0) return;
    
    const newGroups = [...groups];
    [newGroups[index - 1], newGroups[index]] = [newGroups[index], newGroups[index - 1]];
    
    // 更新排序
    const updatedGroups = newGroups.map((g, i) => ({ ...g, order: i + 1 }));
    setGroups(updatedGroups);
    
    // 保存到存储
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      Taro.setStorageSync('mock_groups', JSON.stringify(updatedGroups));
    } else {
      // 小程序端同步到云端
      try {
        await callFunction('group-reorder', {
          orders: updatedGroups.map(g => ({ id: g._id, order: g.order }))
        });
      } catch (err) {
        console.error('[GroupManage] 排序失败:', err);
      }
    }
  };

  // 下移分组
  const moveDown = async (index: number) => {
    if (index === groups.length - 1) return;
    
    const newGroups = [...groups];
    [newGroups[index], newGroups[index + 1]] = [newGroups[index + 1], newGroups[index]];
    
    // 更新排序
    const updatedGroups = newGroups.map((g, i) => ({ ...g, order: i + 1 }));
    setGroups(updatedGroups);
    
    // 保存到存储
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      Taro.setStorageSync('mock_groups', JSON.stringify(updatedGroups));
    } else {
      try {
        await callFunction('group-reorder', {
          orders: updatedGroups.map(g => ({ id: g._id, order: g.order }))
        });
      } catch (err) {
        console.error('[GroupManage] 排序失败:', err);
      }
    }
  };

  return (
    <View className="min-h-screen bg-gray-50">
      <View className="p-3 space-y-3">
        {/* 说明 */}
        <View className="bg-blue-50 rounded-lg p-3">
          <Text className="text-sm text-blue-600">
            任务分组用于对任务进行分类管理，例如按项目、客户、工作类型等维度划分。
          </Text>
        </View>

        {/* 分组列表 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <View className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="flex items-center py-2">
                    <Skeleton className="w-10 h-10 rounded-lg mr-3" />
                    <Skeleton className="h-4 w-24 flex-1" />
                  </View>
                ))}
              </View>
            ) : groups.length === 0 ? (
              <View className="flex flex-col items-center justify-center py-12">
                <Text className="text-gray-400 mb-2">暂无分组</Text>
                <Text className="text-sm text-gray-300">点击下方按钮添加分组</Text>
              </View>
            ) : (
              groups.map((group, index) => (
                <View key={group._id}>
                  <View className="flex items-center px-4 py-3">
                    {/* 排序按钮 */}
                    <View className="flex flex-col mr-2">
                      <View 
                        className={`p-1 ${index === 0 ? 'opacity-30' : 'active:bg-gray-100'}`}
                        onClick={() => moveUp(index)}
                      >
                        <Text className={`text-xs ${index === 0 ? 'text-gray-300' : 'text-gray-500'}`}>↑</Text>
                      </View>
                      <View 
                        className={`p-1 ${index === groups.length - 1 ? 'opacity-30' : 'active:bg-gray-100'}`}
                        onClick={() => moveDown(index)}
                      >
                        <Text className={`text-xs ${index === groups.length - 1 ? 'text-gray-300' : 'text-gray-500'}`}>↓</Text>
                      </View>
                    </View>
                    
                    {/* 分组信息 */}
                    <View className="flex-1">
                      <Text className="text-base text-gray-800">{group.name}</Text>
                      <Text className="text-xs text-gray-400 mt-1">{group.task_count || 0} 个任务</Text>
                    </View>
                    
                    {/* 操作按钮 */}
                    <View className="flex items-center gap-2">
                      <View 
                        className="p-2 bg-blue-50 rounded-lg"
                        onClick={() => openEditDialog(group)}
                      >
                        <Pencil size={16} color="#3B82F6" />
                      </View>
                      <View 
                        className="p-2 bg-red-50 rounded-lg"
                        onClick={() => openDeleteDialog(group)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </View>
                    </View>
                  </View>
                  {index < groups.length - 1 && <Separator className="mx-4" />}
                </View>
              ))
            )}
          </CardContent>
        </Card>

        {/* 新增按钮 */}
        <Button
          className="w-full bg-blue-500 text-white"
          onClick={() => { setInputName(''); setShowAddDialog(true); }}
        >
          <Plus size={18} color="#ffffff" />
          <Text className="ml-2">新增分组</Text>
        </Button>
      </View>

      {/* 新增分组对话框 */}
      {showAddDialog && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>新增任务分组</DialogTitle>
            </DialogHeader>
            <View className="mt-4">
              <Input
                placeholder="请输入分组名称"
                value={inputName}
                onInput={(e) => setInputName(e.detail.value)}
                maxlength={20}
                className="bg-gray-50 border-gray-200"
              />
            </View>
            <View className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button className="flex-1 bg-blue-500 text-white" onClick={addGroup} disabled={submitting}>
                {submitting ? '添加中...' : '确定'}
              </Button>
            </View>
          </DialogContent>
        </Dialog>
      )}

      {/* 编辑分组对话框 */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>编辑分组名称</DialogTitle>
            </DialogHeader>
            <View className="mt-4">
              <Input
                placeholder="请输入分组名称"
                value={inputName}
                onInput={(e) => setInputName(e.detail.value)}
                maxlength={20}
                className="bg-gray-50 border-gray-200"
              />
            </View>
            <View className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button className="flex-1 bg-blue-500 text-white" onClick={editGroup} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </View>
          </DialogContent>
        </Dialog>
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>删除分组</DialogTitle>
            </DialogHeader>
            <View className="mt-4">
              <Text className="text-gray-600">确定要删除分组「{editingGroup?.name}」吗？</Text>
              <Text className="text-sm text-gray-400 mt-2">删除后，该分组下的任务将移至「未分组」</Text>
            </View>
            <View className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)}>
                取消
              </Button>
              <Button className="flex-1 bg-red-500 text-white" onClick={deleteGroup} disabled={submitting}>
                {submitting ? '删除中...' : '删除'}
              </Button>
            </View>
          </DialogContent>
        </Dialog>
      )}
    </View>
  );
}
