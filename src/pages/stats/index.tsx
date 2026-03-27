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

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 时间范围选择 */}
      <View className="bg-white px-3 py-2 mb-3">
        <View className="flex gap-2">
          {(['week', 'month', 'all'] as RangeType[]).map((type) => (
            <View
              key={type}
              className={`px-4 py-2 rounded-full text-sm ${
                rangeType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setRangeType(type)}
            >
              <Text>{type === 'week' ? '本周' : type === 'month' ? '本月' : '全部'}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView className="h-screen" scrollY>
        {/* 核心指标 */}
        <View className="px-3 mb-3">
          <View className="grid grid-cols-4 gap-2">
            <Card>
              <CardContent className="p-3 flex flex-col items-center">
                <Text className="text-2xl mb-1">📋</Text>
                <Text className="text-xl font-bold text-gray-800">{metrics.totalTasks}</Text>
                <Text className="text-xs text-gray-500">总任务数</Text>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col items-center">
                <Text className="text-2xl mb-1">✅</Text>
                <Text className="text-xl font-bold text-green-500">{metrics.completedTasks}</Text>
                <Text className="text-xs text-gray-500">已完成</Text>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col items-center">
                <Text className="text-2xl mb-1">📈</Text>
                <Text className="text-xl font-bold text-blue-500">{metrics.avgScore}</Text>
                <Text className="text-xs text-gray-500">平均分</Text>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col items-center">
                <Text className="text-2xl mb-1">🎯</Text>
                <Text className="text-xl font-bold text-orange-500">{metrics.onTimeRate}%</Text>
                <Text className="text-xs text-gray-500">按时率</Text>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* 分数分布 */}
        <View className="px-3 mb-3">
          <Card>
            <CardContent className="p-4">
              <Text className="text-base font-semibold text-gray-800 mb-4">📊 分数分布</Text>
              {scoreDistribution.map((item) => (
                <View key={item.range} className="mb-3 last:mb-0">
                  <View className="flex items-center justify-between mb-1">
                    <Text className="text-sm text-gray-600">{item.range}</Text>
                    <Text className="text-sm text-gray-500">{item.count}个</Text>
                  </View>
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>
        </View>

        {/* 优先级分布 */}
        <View className="px-3 mb-3">
          <Card>
            <CardContent className="p-4">
              <Text className="text-base font-semibold text-gray-800 mb-4">🚨 优先级分布</Text>
              {priorityDistribution.map((item) => (
                <View key={item.priority} className="flex items-center mb-2 last:mb-0">
                  <Badge
                    className={`w-10 justify-center ${
                      item.priority === 'P0'
                        ? 'bg-red-50 text-red-500'
                        : item.priority === 'P1'
                        ? 'bg-orange-50 text-orange-500'
                        : item.priority === 'P2'
                        ? 'bg-blue-50 text-blue-500'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.priority}
                  </Badge>
                  <View className="flex-1 mx-3">
                    <Progress value={item.percentage} className="h-2" />
                  </View>
                  <Text className="text-sm text-gray-500 w-16 text-right">
                    {item.count}个 ({item.percentage}%)
                  </Text>
                </View>
              ))}
            </CardContent>
          </Card>
        </View>

        {/* 刷新按钮 */}
        <View className="px-3 py-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={loadStats}
            disabled={loading}
          >
            🔄 刷新数据
          </Button>
        </View>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
