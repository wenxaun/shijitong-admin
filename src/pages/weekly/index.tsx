import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import { Task, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface WeeklyData {
  totalTasks: number;
  completedTasks: number;
  avgScore: number;
  tasks: Task[];
}

export default function Weekly() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);

  const loadWeekly = useCallback(async () => {
    if (!openid) return;

    setLoading(true);
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setWeeklyData({
          totalTasks: 5,
          completedTasks: 4,
          avgScore: 85,
          tasks: [
            {
              _id: '1',
              task_id: '1',
              task_name: '完成项目文档',
              status: 'completed',
              priority: 'P1',
              publisher_id: openid,
              require_date: '2026-03-25',
              score: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '2',
              task_id: '2',
              task_name: '代码审查',
              status: 'completed',
              priority: 'P2',
              publisher_id: openid,
              require_date: '2026-03-24',
              score: 80,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        });
        setLoading(false);
        return;
      }

      const res = await callFunction<CloudResponse<WeeklyData>>(
        'task-weekly',
        {}
      );

      if (res.success && res.data) {
        setWeeklyData(res.data);
      }
    } catch (err) {
      console.error('加载周报失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [openid]);

  useEffect(() => {
    loadWeekly();
  }, [loadWeekly]);

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-3">
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-48 w-full" />
      </View>
    );
  }

  if (!weeklyData) {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Text className="text-gray-400">暂无周报数据</Text>
      </View>
    );
  }

  const completionRate = weeklyData.totalTasks > 0
    ? Math.round((weeklyData.completedTasks / weeklyData.totalTasks) * 100)
    : 0;

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="h-screen" scrollY>
        {/* 周报头部 */}
        <View className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-6">
          <Text className="text-xl text-white font-bold mb-2">本周任务报告</Text>
          <Text className="text-blue-100">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* 核心指标 */}
        <View className="px-3 -mt-4">
          <Card>
            <CardContent className="p-4">
              <View className="grid grid-cols-3 gap-4">
                <View className="flex flex-col items-center">
                  <Text className="text-2xl font-bold text-gray-800">{weeklyData.totalTasks}</Text>
                  <Text className="text-xs text-gray-500">总任务</Text>
                </View>
                <View className="flex flex-col items-center">
                  <Text className="text-2xl font-bold text-green-500">{weeklyData.completedTasks}</Text>
                  <Text className="text-xs text-gray-500">已完成</Text>
                </View>
                <View className="flex flex-col items-center">
                  <Text className="text-2xl font-bold text-blue-500">{weeklyData.avgScore}</Text>
                  <Text className="text-xs text-gray-500">平均分</Text>
                </View>
              </View>

              {/* 完成率进度条 */}
              <View className="mt-4">
                <View className="flex items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">完成率</Text>
                  <Text className="text-sm text-blue-500">{completionRate}%</Text>
                </View>
                <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${completionRate}%` }}
                  />
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* 任务列表 */}
        <View className="px-3 mt-3">
          <Text className="text-base font-semibold text-gray-800 mb-3">本周任务</Text>
          {weeklyData.tasks.length > 0 ? (
            weeklyData.tasks.map((task) => (
              <Card
                key={task._id}
                className="mb-3"
                onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${task.task_id}` })}
              >
                <CardContent className="p-3">
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-base font-semibold text-gray-800 flex-1" numberOfLines={1}>
                      {task.task_name}
                    </Text>
                    <Badge className={task.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}>
                      {task.status === 'completed' ? '已完成' : '进行中'}
                    </Badge>
                  </View>
                  <View className="flex items-center gap-2">
                    <Badge className="bg-gray-100 text-gray-600">{task.priority}</Badge>
                    {task.score !== null && task.score !== undefined && (
                      <Text className={`text-sm font-semibold ${task.score >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
                        {task.score}分
                      </Text>
                    )}
                  </View>
                </CardContent>
              </Card>
            ))
          ) : (
            <View className="flex flex-col items-center py-10">
              <Text className="text-gray-400">本周暂无任务</Text>
            </View>
          )}
        </View>

        {/* 刷新按钮 */}
        <View className="px-3 py-4">
          <Button variant="outline" className="w-full" onClick={loadWeekly}>
            🔄 刷新周报
          </Button>
        </View>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
