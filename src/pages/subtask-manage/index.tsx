import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { TaskStatus, Subtask, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, ClipboardList } from 'lucide-react-taro';

// 状态映射
const STATUS_MAP: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: '待办', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: 'bg-green-50 text-green-600' },
  cancelled: { label: '已取消', color: 'bg-red-50 text-red-500' },
  exception: { label: '异常', color: 'bg-orange-50 text-orange-600' }
};

interface SubtaskWithMeta extends Subtask {
  executor_name?: string;
  is_overdue?: boolean;
}

export default function SubtaskManage() {
  const router = useRouter();
  const parentTaskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [parentTaskStatus, setParentTaskStatus] = useState<TaskStatus>('pending');
  const [subtasks, setSubtasks] = useState<SubtaskWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [progress, setProgress] = useState(0);

  // 加载主任务状态
  const loadParentTaskStatus = useCallback(async () => {
    if (!parentTaskId) return;

    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setParentTaskStatus('in_progress');
        return;
      }

      // @ts-ignore
      const db = wx.cloud.database();
      const res = await db.collection('tasks').doc(parentTaskId).get();
      if (res.data) {
        setParentTaskStatus(res.data.status);
      }
    } catch (err) {
      console.error('加载主任务状态失败:', err);
    }
  }, [parentTaskId]);

  // 加载子任务列表
  const loadSubtasks = useCallback(async () => {
    if (!parentTaskId) return;

    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ subtasks: Subtask[] }>>(
        CLOUD_FUNCTIONS.SUBTASK_LIST,
        { parent_task_id: parentTaskId }
      );

      if (res.success && res.data) {
        const list = res.data.subtasks || [];
        const totalNum = list.length;
        const completed = list.filter(s => s.status === 'completed').length;
        const progressNum = totalNum > 0 ? Math.round((completed / totalNum) * 100) : 0;

        // 检查逾期
        const now = new Date();
        const enrichedSubtasks: SubtaskWithMeta[] = list.map(s => {
          const requireDate = s.require_date ? new Date(s.require_date) : null;
          const isOverdue = requireDate && requireDate < now && s.status !== 'completed';
          return {
            ...s,
            is_overdue: !!isOverdue
          };
        });

        setSubtasks(enrichedSubtasks);
        setTotal(totalNum);
        setCompletedCount(completed);
        setProgress(progressNum);

        // 如果全部完成，提示是否完成主任务
        if (totalNum > 0 && progressNum === 100) {
          checkParentTaskCompletion();
        }
      }
    } catch (err) {
      console.error('加载子任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [parentTaskId]);

  // 检查主任务完成状态
  const checkParentTaskCompletion = () => {
    Taro.showModal({
      title: '所有子任务已完成',
      content: '是否将主任务标记为完成？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.TASK_UPDATE,
              { task_id: parentTaskId, status: 'completed' }
            );

            if (result.success) {
              Taro.showToast({ title: '已完成', icon: 'success' });
              setTimeout(() => Taro.navigateBack(), 1500);
            } else {
              Taro.showModal({
                title: '提示',
                content: result.message || '更新失败，请检查权限',
                showCancel: false
              });
            }
          } catch (err) {
            console.error('更新主任务失败:', err);
            Taro.showToast({ title: '更新失败', icon: 'none' });
          }
        }
      }
    });
  };

  useEffect(() => {
    loadParentTaskStatus();
    loadSubtasks();
  }, [loadParentTaskStatus, loadSubtasks]);

  // 页面显示时刷新
  Taro.useDidShow(() => {
    if (parentTaskId) {
      loadSubtasks();
    }
  });

  // 跳转到添加子任务页面
  const goToAddSubtask = () => {
    Taro.navigateTo({ url: `/pages/subtask-create/index?id=${parentTaskId}` });
  };

  // 跳转到子任务详情页
  const goToSubtaskDetail = (subtaskId: string) => {
    Taro.navigateTo({ url: `/pages/subtask-detail/index?id=${subtaskId}` });
  };

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-3">
        <Card>
          <CardContent className="p-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="h-screen" scrollY>
        {/* 进度卡片 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-semibold text-gray-800">子任务进度</Text>
              <Text className="text-sm text-blue-500">{completedCount}/{total}</Text>
            </View>
            <Progress value={progress} className="h-2 mb-2" />
            <Text className="text-sm text-gray-500">{progress}% 完成</Text>
          </CardContent>
        </Card>

        {/* 添加按钮（待办状态不显示） */}
        {parentTaskStatus !== 'pending' && (
          <Card className="mx-3 mt-3" onClick={goToAddSubtask}>
            <CardContent className="p-4">
              <View className="flex items-center justify-center">
                <Plus size={20} color="#1377EB" />
                <Text className="text-blue-500 ml-2">添加子任务</Text>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 待办状态提示 */}
        {parentTaskStatus === 'pending' && (
          <View className="mx-3 mt-3 p-4 bg-blue-50 rounded-lg">
            <Text className="text-blue-500">ℹ️ 主任务需先开始才能添加子任务</Text>
          </View>
        )}

        {/* 子任务列表 */}
        <View className="px-3 mt-3">
          {subtasks.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-16">
              <ClipboardList size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4">暂无子任务</Text>
              {parentTaskStatus !== 'pending' && (
                <Button className="mt-4" size="sm" onClick={goToAddSubtask}>
                  添加子任务
                </Button>
              )}
            </View>
          ) : (
            subtasks.map((subtask) => {
              const statusInfo = STATUS_MAP[subtask.status];
              return (
                <Card
                  key={subtask._id}
                  className="mb-3"
                  onClick={() => goToSubtaskDetail(subtask._id)}
                >
                  <CardContent className="p-3">
                    <View className="flex items-center">
                      <View
                        className={`w-2 h-2 rounded-full mr-3 ${
                          subtask.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-800">
                          {subtask.task_name || subtask.name}
                        </Text>
                        <View className="flex items-center gap-3 mt-2">
                          <Text className="text-xs text-gray-500">
                            👤 {subtask.executor_name || '未分配'}
                          </Text>
                          <Text className={`text-xs ${subtask.is_overdue ? 'text-red-500' : 'text-gray-500'}`}>
                            📅 {subtask.require_date}
                          </Text>
                        </View>
                      </View>
                      <View className="flex items-center gap-2">
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        <ChevronRight size={18} color="#9CA3AF" />
                      </View>
                    </View>
                  </CardContent>
                </Card>
              );
            })
          )}
        </View>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
