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
import { ChevronRight, Calendar, User, Award, Archive, Send, Trash2 } from 'lucide-react-taro';

type TabType = 'created' | 'executed' | 'deleted';

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string; bgClass: string }> = {
  pending: { label: '待办', color: '#6B7280', bgClass: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', color: '#1377EB', bgClass: 'bg-blue-50 text-blue-600' },
  completed: { label: '已完成', color: '#00B365', bgClass: 'bg-green-50 text-green-600' },
  cancelled: { label: '已取消', color: '#EA4335', bgClass: 'bg-red-50 text-red-500' },
  deleted: { label: '已删除', color: '#9CA3AF', bgClass: 'bg-gray-100 text-gray-400' }
};

// 优先级颜色
const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  P0: { bg: 'bg-red-50', text: 'text-red-500' },
  P1: { bg: 'bg-orange-50', text: 'text-orange-500' },
  P2: { bg: 'bg-blue-50', text: 'text-blue-500' },
  P3: { bg: 'bg-gray-100', text: 'text-gray-400' }
};

// Tab 配置
const TAB_CONFIG: { value: TabType; label: string; icon: typeof Archive }[] = [
  { value: 'created', label: '我创建的', icon: Send },
  { value: 'executed', label: '我执行的', icon: User },
  { value: 'deleted', label: '已删除', icon: Trash2 }
];

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
              task_name: '示例任务1（提前完成）',
              status: 'completed',
              priority: 'P1',
              publisher_id: openid,
              executor_name: '测试用户',
              require_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              complete_date: new Date().toISOString(),
              score: 100,
              score_note: '提前1天完成',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '2',
              task_id: '2',
              task_name: '示例任务2（按时完成）',
              status: 'completed',
              priority: 'P2',
              publisher_id: openid,
              executor_name: '测试用户',
              require_date: new Date().toISOString().split('T')[0],
              complete_date: new Date().toISOString(),
              score: 80,
              score_note: '按时完成',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '3',
              task_id: '3',
              task_name: '示例任务3（逾期完成）',
              status: 'completed',
              priority: 'P1',
              publisher_id: openid,
              executor_name: '测试用户',
              require_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
              complete_date: new Date().toISOString(),
              score: 65,
              score_note: '逾期3天完成',
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

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00B365';
    if (score >= 60) return '#FF7D27';
    return '#EA4335';
  };

  // 渲染任务卡片
  const renderTaskCard = (task: Task) => {
    const statusInfo = STATUS_MAP[task.status] || STATUS_MAP.pending;
    const priorityStyle = PRIORITY_STYLE[task.priority || 'P2'];

    return (
      <Card
        key={task._id}
        className="mb-3 overflow-hidden"
        onClick={() => goDetail(task.task_id)}
      >
        <CardContent className="p-0">
          {/* 顶部状态条 */}
          <View 
            className="h-1"
            style={{ backgroundColor: statusInfo.color }}
          />
          
          <View className="p-4">
            {/* 标题行 */}
            <View className="flex items-start justify-between mb-3">
              <View className="flex-1 mr-3">
                <Text className="text-base font-semibold text-gray-800 leading-6" numberOfLines={2}>
                  {task.task_name}
                </Text>
              </View>
              <Badge className={`${priorityStyle.bg} ${priorityStyle.text}`}>
                {task.priority || 'P2'}
              </Badge>
            </View>

            {/* 信息行 */}
            <View className="flex items-center gap-4 mb-3">
              <View className="flex items-center gap-1">
                <Calendar size={14} color="#9CA3AF" />
                <Text className="text-xs text-gray-400">{task.require_date}</Text>
              </View>
              <Badge className={statusInfo.bgClass}>{statusInfo.label}</Badge>
            </View>

            {/* 评分 */}
            {task.score !== null && task.score !== undefined && (
              <View className="flex items-center justify-between pt-3 border-t border-gray-100">
                <View className="flex items-center gap-2">
                  <Award size={16} color={getScoreColor(task.score)} />
                  <Text className="text-sm text-gray-500">任务评分</Text>
                </View>
                <View className="flex items-center gap-2">
                  <Text 
                    className="text-lg font-bold"
                    style={{ color: getScoreColor(task.score) }}
                  >
                    {task.score}
                  </Text>
                  <Text className="text-sm text-gray-400">分</Text>
                </View>
              </View>
            )}

            {/* 评分备注 */}
            {task.score_note && (
              <View className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  {task.score_note}
                </Text>
              </View>
            )}
          </View>

          {/* 右箭头 */}
          <View className="absolute right-3 top-1/2 -translate-y-1/2">
            <ChevronRight size={20} color="#D1D5DB" />
          </View>
        </CardContent>
      </Card>
    );
  };

  // 获取当前 Tab 图标
  const CurrentTabIcon = TAB_CONFIG.find(t => t.value === currentTab)?.icon || Archive;

  return (
    <View className="min-h-screen bg-gray-50">
      {/* Tab 选择 */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex gap-2">
          {TAB_CONFIG.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = currentTab === tab.value;
            
            return (
              <View
                key={tab.value}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-blue-500' 
                    : 'bg-gray-50'
                }`}
                onClick={() => setCurrentTab(tab.value)}
              >
                <TabIcon size={18} color={isActive ? '#ffffff' : '#9CA3AF'} />
                <Text className={`text-xs mt-1 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {tab.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 任务列表 */}
      <ScrollView className="flex-1" scrollY style={{ height: "calc(100vh - 50px)" }}>
        <View className="px-4 pt-4 pb-24">
          {loading && tasks.length === 0 ? (
            <View className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <Skeleton className="h-3 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : tasks.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CurrentTabIcon size={36} color="#D1D5DB" />
              </View>
              <Text className="text-gray-500 mb-2">暂无历史记录</Text>
              <Text className="text-gray-400 text-sm">完成任务后将在这里显示</Text>
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
