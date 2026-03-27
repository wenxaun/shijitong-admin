import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { TaskStatus, ChecklistItem, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Pencil, Plus, Trash2, Play } from 'lucide-react-taro';

// 状态映射
const STATUS_MAP: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: '待办', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: 'bg-green-50 text-green-600' },
  cancelled: { label: '已取消', color: 'bg-red-50 text-red-500' },
  exception: { label: '异常', color: 'bg-orange-50 text-orange-600' }
};

// 优先级颜色
const PRIORITY_COLOR: Record<string, string> = {
  P0: 'text-red-500',
  P1: 'text-orange-500',
  P2: 'text-blue-500',
  P3: 'text-gray-400'
};

interface SubtaskDetail {
  _id: string;
  task_name: string;
  task_description?: string;
  status: TaskStatus;
  priority?: string;
  executor_id?: string;
  executor_name?: string;
  require_date?: string;
  checklist?: ChecklistItem[];
}

export default function SubtaskDetail() {
  const router = useRouter();
  const subtaskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [subtask, setSubtask] = useState<SubtaskDetail | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistProgress, setChecklistProgress] = useState(0);

  // 加载子任务详情
  const loadSubtask = useCallback(async () => {
    if (!subtaskId) return;

    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ subtask: SubtaskDetail }>>(
        'subtask-detail',
        { subtask_id: subtaskId }
      );

      if (res.success && res.data?.subtask) {
        const subtaskData = res.data.subtask;

        // 检查逾期
        const today = new Date();
        const requireDate = subtaskData.require_date ? new Date(subtaskData.require_date) : null;
        const overdue = requireDate && requireDate < today && subtaskData.status !== 'completed';

        // 处理清单
        const list = subtaskData.checklist || [];
        const completedCount = list.filter((i: ChecklistItem) => i.completed).length;
        const progress = list.length > 0 ? Math.round((completedCount / list.length) * 100) : 0;

        setSubtask(subtaskData);
        setIsOverdue(!!overdue);
        setChecklist(list);
        setChecklistProgress(progress);
      } else {
        Taro.showToast({ title: '子任务不存在', icon: 'none' });
      }
    } catch (err) {
      console.error('加载子任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [subtaskId]);

  useEffect(() => {
    loadSubtask();
  }, [loadSubtask]);

  // 页面显示时刷新
  Taro.useDidShow(() => {
    if (subtaskId) {
      loadSubtask();
    }
  });

  // 开始子任务
  const startSubtask = () => {
    Taro.showModal({
      title: '确认开始',
      content: '确定开始该子任务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.SUBTASK_UPDATE,
              { subtask_id: subtaskId, status: 'in_progress' }
            );

            if (result.success) {
              Taro.showToast({ title: '开始成功', icon: 'success' });
              loadSubtask();
            } else {
              Taro.showToast({ title: result.message || '操作失败', icon: 'none' });
            }
          } catch (err) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 完成子任务
  const completeSubtask = () => {
    Taro.showModal({
      title: '确认完成',
      content: '确定完成该子任务吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.SUBTASK_UPDATE,
              { subtask_id: subtaskId, status: 'completed' }
            );

            if (result.success) {
              Taro.showToast({ title: '完成成功', icon: 'success' });
              loadSubtask();
            } else {
              Taro.showToast({ title: result.message || '操作失败', icon: 'none' });
            }
          } catch (err) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 编辑子任务
  const editSubtask = () => {
    Taro.navigateTo({ url: `/pages/subtask-edit/index?id=${subtaskId}` });
  };

  // 添加检查项
  const addChecklistItem = () => {
    Taro.showModal({
      title: '添加检查项',
      content: '请输入检查项内容',
      success: async (res) => {
        if (res.confirm) {
          // Taro.showModal 不支持 editable，需要用其他方式
          Taro.showToast({ title: '请使用小程序端添加', icon: 'none' });
        }
      }
    });
  };

  // 切换检查项状态
  const toggleChecklistItem = async (itemId: string) => {
    const item = checklist.find(i => i.id === itemId);
    if (!item) return;

    const newCompleted = !item.completed;
    const newChecklist = checklist.map(i => {
      if (i.id === itemId) {
        return {
          ...i,
          completed: newCompleted,
          completed_at: newCompleted ? Date.now() : null
        };
      }
      return i;
    });

    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.SUBTASK_UPDATE,
        { subtask_id: subtaskId, checklist: newChecklist }
      );

      if (res.success) {
        setChecklist(newChecklist);
        const completedCount = newChecklist.filter(i => i.completed).length;
        setChecklistProgress(
          newChecklist.length > 0 ? Math.round((completedCount / newChecklist.length) * 100) : 0
        );
      }
    } catch (err) {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  // 删除检查项
  const deleteChecklistItem = (itemId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定删除该检查项吗？',
      success: async (res) => {
        if (res.confirm) {
          const newChecklist = checklist.filter(i => i.id !== itemId);

          try {
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.SUBTASK_UPDATE,
              { subtask_id: subtaskId, checklist: newChecklist }
            );

            if (result.success) {
              setChecklist(newChecklist);
              const completedCount = newChecklist.filter(i => i.completed).length;
              setChecklistProgress(
                newChecklist.length > 0 ? Math.round((completedCount / newChecklist.length) * 100) : 0
              );
              Taro.showToast({ title: '删除成功', icon: 'success' });
            }
          } catch (err) {
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  };

  // 格式化时间
  const formatDateTime = (timestamp: number | null | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-3">
        <Card>
          <CardContent className="p-3">
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </View>
    );
  }

  if (!subtask) {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Text className="text-gray-400">子任务不存在</Text>
      </View>
    );
  }

  const statusInfo = STATUS_MAP[subtask.status];

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="h-screen" scrollY>
        {/* 子任务信息卡片 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <Text className="text-xl font-bold text-gray-800 mb-2">{subtask.task_name}</Text>
            {subtask.task_description && (
              <Text className="text-sm text-gray-500 mb-4">{subtask.task_description}</Text>
            )}

            <View className="grid grid-cols-2 gap-3 mb-4">
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">负责人</Text>
                <Text className="text-sm text-gray-800">{subtask.executor_name || '未分配'}</Text>
              </View>
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">截止日期</Text>
                <Text className={`text-sm ${isOverdue ? 'text-red-500' : 'text-gray-800'}`}>
                  {subtask.require_date || '未设置'}
                </Text>
              </View>
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">优先级</Text>
                <Text className={`text-sm font-semibold ${PRIORITY_COLOR[subtask.priority || 'P2']}`}>
                  {subtask.priority || 'P2'}
                </Text>
              </View>
              <View className="flex flex-col">
                <Text className="text-xs text-gray-400">状态</Text>
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </View>
            </View>

            {/* 操作按钮 */}
            <View className="flex gap-3">
              {subtask.status === 'pending' && (
                <Button className="flex-1 bg-blue-500 text-white" onClick={startSubtask}>
                  <Play size={16} color="#ffffff" />
                  <Text className="text-white ml-2">开始</Text>
                </Button>
              )}
              {subtask.status === 'in_progress' && (
                <Button className="flex-1 bg-green-500 text-white" onClick={completeSubtask}>
                  <Check size={16} color="#ffffff" />
                  <Text className="text-white ml-2">完成</Text>
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={editSubtask}>
                <Pencil size={16} color="#6B7280" />
                <Text className="ml-2">编辑</Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* 检查清单 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-semibold text-gray-800">检查清单</Text>
              <Text className="text-sm text-blue-500">
                {checklist.filter(i => i.completed).length}/{checklist.length}
              </Text>
            </View>

            {checklist.length > 0 && (
              <View className="mb-4">
                <Progress value={checklistProgress} className="h-2" />
              </View>
            )}

            {/* 清单项列表 */}
            <View className="space-y-2">
              {checklist.map((item) => (
                <View
                  key={item.id}
                  className={`flex items-center p-3 bg-gray-50 rounded-lg ${
                    item.completed ? 'opacity-60' : ''
                  }`}
                >
                  <View
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                      item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}
                    onClick={() => toggleChecklistItem(item.id)}
                  >
                    {item.completed && <Check size={14} color="#ffffff" />}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {item.title}
                    </Text>
                    {item.completed_at && (
                      <Text className="text-xs text-gray-400">{formatDateTime(item.completed_at)}</Text>
                    )}
                  </View>
                  <View onClick={() => deleteChecklistItem(item.id)}>
                    <Trash2 size={16} color="#9CA3AF" />
                  </View>
                </View>
              ))}
            </View>

            {/* 添加按钮 */}
            <View
              className="flex items-center justify-center p-3 mt-2 border-2 border-dashed border-gray-200 rounded-lg"
              onClick={addChecklistItem}
            >
              <Plus size={18} color="#1377EB" />
              <Text className="text-blue-500 ml-2">添加检查项</Text>
            </View>
          </CardContent>
        </Card>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
