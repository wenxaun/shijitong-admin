import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import { Task, CloudResponse, TaskListResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type TabType = 'created' | 'executed' | 'deleted';

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待办', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', color: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: 'bg-green-50 text-green-600' },
  cancelled: { label: '已取消', color: 'bg-red-50 text-red-500' },
  deleted: { label: '已删除', color: 'bg-gray-100 text-gray-400' }
};

// 优先级颜色
const PRIORITY_COLOR: Record<string, string> = {
  P0: 'bg-red-50 text-red-500',
  P1: 'bg-orange-50 text-orange-500',
  P2: 'bg-blue-50 text-blue-500',
  P3: 'bg-gray-100 text-gray-400'
};

export default function History() {
  const { openid } = useUserStore();
  const [currentTab, setCurrentTab] = useState<TabType>('created');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // 加载历史任务
  const loadTasks = useCallback(async (refresh = false) => {
    if (!openid) return;

    setLoading(true);
    try {
      const currentPage = refresh ? 1 : page;

      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        if (refresh) {
          setTasks([
            {
              _id: '1',
              task_id: '1',
              task_name: '示例任务1',
              status: 'completed',
              priority: 'P1',
              publisher_id: openid,
              require_date: '2026-03-20',
              score: 85,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '2',
              task_id: '2',
              task_name: '示例任务2',
              status: 'completed',
              priority: 'P2',
              publisher_id: openid,
              require_date: '2026-03-15',
              score: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        }
        setHasMore(false);
        setLoading(false);
        return;
      }

      const res = await callFunction<CloudResponse<TaskListResponse>>(
        'task-history',
        {
          type: currentTab,
          page: currentPage,
          pageSize: 20
        }
      );

      if (res.success && res.data) {
        const newTasks = res.data.tasks || [];
        setTasks(refresh ? newTasks : [...tasks, ...newTasks]);
        setHasMore(res.data.hasMore);
        setPage(currentPage);
      }
    } catch (err) {
      console.error('加载历史失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [openid, currentTab, page, tasks]);

  useEffect(() => {
    loadTasks(true);
  }, [currentTab]);

  // 跳转详情
  const goDetail = (taskId: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${taskId}` });
  };

  // 加载更多
  const loadMore = () => {
    if (!loading && hasMore) {
      loadTasks();
    }
  };

  // 渲染任务卡片
  const renderTaskCard = (task: Task) => {
    const statusInfo = STATUS_MAP[task.status] || STATUS_MAP.pending;

    return (
      <Card
        key={task._id}
        className="mb-3 active:bg-gray-50"
        onClick={() => goDetail(task.task_id)}
      >
        <CardContent className="p-3">
          {/* 标题行 */}
          <View className="flex items-center justify-between mb-2">
            <Text className="text-base font-semibold text-gray-800 flex-1" numberOfLines={1}>
              {task.task_name}
            </Text>
            <Badge className={PRIORITY_COLOR[task.priority || 'P2']}>
              {task.priority || 'P2'}
            </Badge>
          </View>

          {/* 状态和日期 */}
          <View className="flex items-center gap-2 mb-2">
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <Text className="text-xs text-gray-400">截止：{task.require_date}</Text>
          </View>

          {/* 评分 */}
          {task.score !== null && task.score !== undefined && (
            <View className="flex items-center gap-2">
              <Text
                className={`text-sm font-semibold ${
                  task.score >= 80 ? 'text-green-500' : task.score >= 60 ? 'text-orange-500' : 'text-red-500'
                }`}
              >
                {task.score}分
              </Text>
              {task.score_note && (
                <Text className="text-xs text-gray-400" numberOfLines={1}>
                  {task.score_note}
                </Text>
              )}
            </View>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <View className="min-h-screen bg-gray-50">
      {/* Tab 选择 */}
      <View className="bg-white px-3 py-2 mb-3">
        <ScrollView scrollX className="whitespace-nowrap">
          <View className="flex gap-2">
            {([
              { value: 'created', label: '我创建的' },
              { value: 'executed', label: '我执行的' },
              { value: 'deleted', label: '已删除' }
            ] as { value: TabType; label: string }[]).map((tab) => (
              <View
                key={tab.value}
                className={`px-4 py-2 rounded-full text-sm ${
                  currentTab === tab.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
                onClick={() => setCurrentTab(tab.value)}
              >
                <Text>{tab.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 任务列表 */}
      <ScrollView className="h-screen" scrollY>
        <View className="px-3 pb-20">
          {loading && tasks.length === 0 ? (
            <View className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : tasks.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20">
              <Text className="text-4xl mb-4 opacity-30">📋</Text>
              <Text className="text-gray-500">暂无历史记录</Text>
            </View>
          ) : (
            <>
              {tasks.map(renderTaskCard)}
              {hasMore && (
                <View className="flex justify-center py-4">
                  <Button variant="ghost" size="sm" onClick={loadMore}>
                    加载更多
                  </Button>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
