import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse, Task } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader, ClipboardList, Trash2 } from 'lucide-react-taro';
import { STATUS_MAP, PRIORITY_STYLE } from '@/constants';

export default function AdminTasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, [filterStatus]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ tasks: Task[] }>>('task-list', {
        status: filterStatus === 'all' ? undefined : filterStatus,
        page: 1,
        pageSize: 100,
        view_type: 'all'
      });

      if (res.success && res.data) {
        setTasks(res.data.tasks || []);
      }
    } catch (error) {
      console.error('[AdminTasks] 加载任务失败:', error);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (!selectedTask) return;

    setActionLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ success: boolean }>>('task-delete', {
        task_id: selectedTask.task_id
      });

      if (res.success) {
        Taro.showToast({ title: '删除成功', icon: 'success' });
        setShowDeleteDialog(false);
        loadTasks();
      } else {
        Taro.showToast({ title: res.message || '删除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('[AdminTasks] 删除任务失败:', error);
      Taro.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      setActionLoading(false);
    }
  };

  const statusFilters = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待办' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
    { value: 'exception', label: '异常' }
  ];

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
              <Text className="text-2xl font-bold text-blue-600">{tasks.length}</Text>
              <Text className="text-xs text-gray-500 block mt-1">总任务数</Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3 text-center">
              <Text className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'completed').length}
              </Text>
              <Text className="text-xs text-gray-500 block mt-1">已完成</Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-3 text-center">
              <Text className="text-2xl font-bold text-orange-600">
                {tasks.filter(t => t.status === 'pending').length}
              </Text>
              <Text className="text-xs text-gray-500 block mt-1">待处理</Text>
            </CardContent>
          </Card>
        </View>

        {/* 状态筛选 */}
        <View className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {statusFilters.map(filter => (
            <Badge
              key={filter.value}
              className={`${filterStatus === filter.value ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'} px-3 py-1 cursor-pointer whitespace-nowrap`}
              onClick={() => setFilterStatus(filter.value)}
            >
              {filter.label}
            </Badge>
          ))}
        </View>

        {/* 任务列表 */}
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList size={48} color="#D1D5DB" className="mx-auto mb-3" />
              <Text className="text-gray-500">暂无任务</Text>
            </CardContent>
          </Card>
        ) : (
          tasks.map(task => (
            <Card key={task.task_id} className="mb-3">
              <CardContent className="p-4">
                <View className="flex items-start justify-between gap-3">
                  {/* 任务信息 */}
                  <View className="flex-1 min-w-0">
                    <View className="flex items-center gap-2 mb-2">
                      <Text className="text-base font-medium text-gray-900 truncate">
                        {task.task_name}
                      </Text>
                      <Badge
                        className={`text-xs px-2 py-1 ${PRIORITY_STYLE[task.priority]?.badge || 'bg-gray-100'}`}
                      >
                        {task.priority}
                      </Badge>
                    </View>

                    <View className="flex flex-wrap items-center gap-2 mb-2">
                      <View className={`px-2 py-1 rounded text-xs ${STATUS_MAP[task.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_MAP[task.status]?.label || task.status}
                      </View>
                      {task.group_name && (
                        <Badge className="text-xs px-2 py-1 bg-purple-100 text-purple-600">
                          {task.group_name}
                        </Badge>
                      )}
                      <Text className="text-xs text-gray-400">
                        {task.publisher_name || task.publisher_id?.slice(-8)}
                      </Text>
                    </View>

                    {task.require_date && (
                      <Text className="text-xs text-gray-500">
                        截止: {task.require_date}
                      </Text>
                    )}

                    {task.task_description && (
                      <Text className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {task.task_description}
                      </Text>
                    )}
                  </View>
                </View>

                {/* 操作按钮 */}
                <View className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => handleDeleteTask(task)}
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
          <Text className="text-xs text-gray-400">共 {tasks.length} 个任务</Text>
        </View>
      </View>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除任务</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-gray-700 mb-2">
              确定要删除任务「{selectedTask?.task_name}」吗？
            </Text>
            <Text className="text-sm text-red-500">
              此操作无法恢复。
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
              onClick={confirmDeleteTask}
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
