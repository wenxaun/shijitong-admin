import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, CircleCheck, TrendingUp, Target, ChartBar, CircleAlert } from 'lucide-react-taro';

type RangeType = 'week' | 'month' | 'all';

interface Metrics {
  totalTasks: number;
  completedTasks: number;
  avgScore: number;
  onTimeRate: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
  color: string;
}

interface PriorityDistribution {
  priority: string;
  count: number;
  percentage: number;
}

export default function Stats() {
  const { openid } = useUserStore();
  const [rangeType, setRangeType] = useState<RangeType>('month');
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState<Metrics>({
    totalTasks: 0,
    completedTasks: 0,
    avgScore: 0,
    onTimeRate: 0
  });

  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<PriorityDistribution[]>([]);

  const loadStats = useCallback(async () => {
    if (!openid) return;

    setLoading(true);
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setMetrics({
          totalTasks: 15,
          completedTasks: 12,
          avgScore: 85,
          onTimeRate: 80
        });
        setScoreDistribution([
          { range: '100分', count: 5, percentage: 42, color: '#00B365' },
          { range: '80-99分', count: 4, percentage: 33, color: '#1377EB' },
          { range: '60-79分', count: 2, percentage: 17, color: '#FF7D27' },
          { range: '<60分', count: 1, percentage: 8, color: '#EA4335' }
        ]);
        setPriorityDistribution([
          { priority: 'P0', count: 2, percentage: 13 },
          { priority: 'P1', count: 5, percentage: 33 },
          { priority: 'P2', count: 6, percentage: 40 },
          { priority: 'P3', count: 2, percentage: 14 }
        ]);
        setLoading(false);
        return;
      }

      const res = await callFunction<CloudResponse<{
        metrics: Metrics;
        scoreDistribution: ScoreDistribution[];
        priorityDistribution: PriorityDistribution[];
      }>>(
        'task-stats',
        { range_type: rangeType }
      );

      if (res.success && res.data) {
        setMetrics(res.data.metrics);
        setScoreDistribution(res.data.scoreDistribution);
        setPriorityDistribution(res.data.priorityDistribution);
      }
    } catch (err) {
      console.error('加载统计失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [openid, rangeType]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // 计算完成率
  const completionRate = metrics.totalTasks > 0 
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) 
    : 0;

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 时间范围选择 */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex gap-2">
          {([
            { value: 'week', label: '本周' },
            { value: 'month', label: '本月' },
            { value: 'all', label: '全部' }
          ] as { value: RangeType; label: string }[]).map((type) => (
            <View
              key={type.value}
              className={`px-5 py-2 rounded-full text-sm transition-all ${
                rangeType === type.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setRangeType(type.value)}
            >
              <Text className={rangeType === type.value ? 'text-white' : 'text-gray-600'}>{type.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView className="h-screen" scrollY>
        {/* 核心指标卡片 */}
        <View className="px-4 pt-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0">
            <CardContent className="p-4">
              <View className="flex items-center justify-between mb-4">
                <View>
                  <Text className="text-white opacity-80 text-sm">完成任务</Text>
                  <View className="flex items-baseline gap-1 mt-1">
                    <Text className="text-3xl font-bold text-white">{metrics.completedTasks}</Text>
                    <Text className="text-white opacity-60 text-sm">/ {metrics.totalTasks}</Text>
                  </View>
                </View>
                <View className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <CircleCheck size={28} color="#ffffff" />
                </View>
              </View>
              <View>
                <View className="flex justify-between mb-1">
                  <Text className="text-white opacity-60 text-xs">完成率</Text>
                  <Text className="text-white text-xs font-semibold">{completionRate}%</Text>
                </View>
                <View className="h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* 数据指标网格 */}
        <View className="px-4 mt-4">
          <View className="grid grid-cols-2 gap-3">
            {/* 平均分 */}
            <Card>
              <CardContent className="p-4">
                <View className="flex items-center gap-3">
                  <View className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} color="#1377EB" />
                  </View>
                  <View>
                    <Text className="text-xs text-gray-400">平均分</Text>
                    <Text className="text-xl font-bold text-gray-800">{metrics.avgScore}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* 按时率 */}
            <Card>
              <CardContent className="p-4">
                <View className="flex items-center gap-3">
                  <View className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Target size={20} color="#00B365" />
                  </View>
                  <View>
                    <Text className="text-xs text-gray-400">按时率</Text>
                    <Text className="text-xl font-bold text-gray-800">{metrics.onTimeRate}%</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* 分数分布 */}
        <View className="px-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-4">
                <ChartBar size={18} color="#1377EB" />
                <Text className="text-base font-semibold text-gray-800">分数分布</Text>
              </View>
              {scoreDistribution.length > 0 ? (
                <View className="space-y-3">
                  {scoreDistribution.map((item) => (
                    <View key={item.range}>
                      <View className="flex items-center justify-between mb-1">
                        <View className="flex items-center gap-2">
                          <View 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <Text className="text-sm text-gray-600">{item.range}</Text>
                        </View>
                        <Text className="text-sm text-gray-500">{item.count}个 ({item.percentage}%)</Text>
                      </View>
                      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full transition-all"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="flex flex-col items-center justify-center py-8">
                  <CircleAlert size={32} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-2">暂无数据</Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* 优先级分布 */}
        <View className="px-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-4">
                <ClipboardList size={18} color="#1377EB" />
                <Text className="text-base font-semibold text-gray-800">优先级分布</Text>
              </View>
              {priorityDistribution.length > 0 ? (
                <View className="space-y-2">
                  {priorityDistribution.map((item) => {
                    const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
                      P0: { bg: 'bg-red-50', text: 'text-red-500', bar: '#EA4335' },
                      P1: { bg: 'bg-orange-50', text: 'text-orange-500', bar: '#FF7D27' },
                      P2: { bg: 'bg-blue-50', text: 'text-blue-500', bar: '#1377EB' },
                      P3: { bg: 'bg-gray-100', text: 'text-gray-400', bar: '#9CA3AF' }
                    };
                    const colors = colorMap[item.priority] || colorMap.P2;
                    
                    return (
                      <View key={item.priority} className="flex items-center gap-3">
                        <Badge className={`w-10 justify-center ${colors.bg} ${colors.text}`}>
                          {item.priority}
                        </Badge>
                        <View className="flex-1">
                          <Progress value={item.percentage} className="h-2" />
                        </View>
                        <Text className="text-sm text-gray-500 w-14 text-right">
                          {item.count}个
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="flex flex-col items-center justify-center py-8">
                  <CircleAlert size={32} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-2">暂无数据</Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* 刷新按钮 */}
        <View className="px-4 py-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={loadStats}
            disabled={loading}
          >
            刷新数据
          </Button>
        </View>

        {/* 底部占位 */}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
