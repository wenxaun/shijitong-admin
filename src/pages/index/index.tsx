import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import { Task, TaskStatus, TaskPriority, CloudResponse, TaskListResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// 状态筛选选项
const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' }
] as const;

// 时间筛选选项
const TIME_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' }
] as const;

// 状态显示映射
const STATUS_MAP: Record<TaskStatus, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消'
};

// 状态颜色映射
const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-500'
};

// 优先级颜色映射
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  P0: 'bg-red-50 text-red-500',
  P1: 'bg-orange-50 text-orange-500',
  P2: 'bg-blue-50 text-blue-500',
  P3: 'bg-gray-100 text-gray-400'
};

export default function Index() {
  const { openid } = useUserStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 加载任务列表
  const loadTasks = useCallback(async (refresh = false) => {
    if (!openid) return;

    setLoading(true);
    try {
      const currentPage = refresh ? 1 : page;
      const res = await callFunction<CloudResponse<TaskListResponse>>(
        CLOUD_FUNCTIONS.TASK_LIST,
        {
          status: statusFilter === 'all' ? undefined : statusFilter,
          time_filter: timeFilter,
          page: currentPage,
          pageSize: 20
        }
      );

      if (res.success && res.data) {
        const newTasks = res.data.tasks || [];
        if (refresh) {
          setTasks(newTasks);
          setPage(1);
        } else {
          setTasks(prev => [...prev, ...newTasks]);
        }
        setHasMore(res.data.hasMore);
      }
    } catch (err) {
      console.error('加载任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [openid, statusFilter, timeFilter, page]);

  // 初始化加载
  useEffect(() => {
    if (openid) {
      loadTasks(true);
    }
  }, [openid]);

  // 页面显示时刷新数据
  Taro.useDidShow(() => {
    if (openid) {
      loadTasks(true);
    }
  });

  // 筛选变化时重新加载
  useEffect(() => {
    if (openid) {
      setTasks([]);
      setPage(1);
      loadTasks(true);
    }
  }, [statusFilter, timeFilter]);

  // 跳转详情
  const goDetail = (taskId: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${taskId}` });
  };

  // 渲染任务卡片
  const renderTaskCard = (task: Task) => (
    <Card
      key={task._id}
      className="mb-3 overflow-hidden active:bg-gray-50"
      onClick={() => goDetail(task.task_id)}
    >
      <CardContent className="p-0">
        <View className="flex">
          {/* 左侧状态条 */}
          <View
            className={`w-1 ${
              task.status === 'completed'
                ? 'bg-green-500'
                : task.status === 'in_progress'
                ? 'bg-blue-500'
                : task.status === 'cancelled'
                ? 'bg-red-500'
                : 'bg-gray-300'
            }`}
          />
          <View className="flex-1 p-3">
            {/* 标题行 */}
            <View className="flex items-center justify-between mb-2">
              <Text className="text-base font-semibold text-gray-800 flex-1" numberOfLines={1}>
                {task.task_name}
              </Text>
              <Badge className={PRIORITY_COLOR[task.priority]}>{task.priority}</Badge>
            </View>

            {/* 元信息行 */}
            <View className="flex items-center gap-2 mb-2">
              <Badge className={STATUS_COLOR[task.status]}>{STATUS_MAP[task.status]}</Badge>
              <Text className="text-xs text-gray-400">截止：{task.require_date}</Text>
            </View>

            {/* 执行人 */}
            {task.executor_name && (
              <View className="flex items-center gap-1 mb-2">
                <Text className="text-xs text-gray-500">👤 {task.executor_name}</Text>
              </View>
            )}

            {/* 进度条 */}
            {task.subtask_count && task.subtask_count > 0 && (
              <View className="flex items-center gap-2 mb-2">
                <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${task.progress || 0}%` }}
                  />
                </View>
                <Text className="text-xs text-gray-400">{task.progress || 0}%</Text>
              </View>
            )}

            {/* 评分 */}
            {task.score !== null && task.score !== undefined && (
              <View className="flex items-center gap-2">
                <Text
                  className={`text-sm font-semibold ${
                    task.score >= 100
                      ? 'text-green-500'
                      : task.score >= 80
                      ? 'text-blue-500'
                      : 'text-orange-500'
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
          </View>
        </View>
      </CardContent>
    </Card>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <View className="flex flex-col items-center justify-center py-20">
      <Text className="text-6xl mb-4 opacity-30">📋</Text>
      <Text className="text-lg font-semibold text-gray-800 mb-2">暂无任务</Text>
      <Text className="text-sm text-gray-500">点击下方「发布」创建新任务</Text>
    </View>
  );

  // 渲染加载中
  const renderLoading = () => (
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
  );

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 筛选栏 */}
      <View className="bg-white px-3 py-2 mb-3">
        {/* 时间筛选 */}
        <View className="flex items-center mb-2">
          <Text className="text-sm text-gray-500 w-12">时间：</Text>
          <ScrollView scrollX className="flex-1 whitespace-nowrap">
            <View className="flex gap-2">
              {TIME_FILTERS.map((item) => (
                <View
                  key={item.value}
                  className={`px-3 py-1 rounded-full text-sm ${
                    timeFilter === item.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => setTimeFilter(item.value)}
                >
                  <Text>{item.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 状态筛选 */}
        <View className="flex items-center">
          <Text className="text-sm text-gray-500 w-12">状态：</Text>
          <ScrollView scrollX className="flex-1 whitespace-nowrap">
            <View className="flex gap-2">
              {STATUS_FILTERS.map((item) => (
                <View
                  key={item.value}
                  className={`px-3 py-1 rounded-full text-sm ${
                    statusFilter === item.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => setStatusFilter(item.value)}
                >
                  <Text>{item.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 任务列表 */}
      <View className="px-3 pb-20">
        {loading && tasks.length === 0 ? (
          renderLoading()
        ) : tasks.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            {tasks.map(renderTaskCard)}
            {hasMore && (
              <View className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadTasks()}
                  disabled={loading}
                >
                  {loading ? '加载中...' : '加载更多'}
                </Button>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
