import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CircleCheck, ChartBar, CircleAlert, Award, Clock } from 'lucide-react-taro';

type RangeType = 'week' | 'month' | 'all';

interface Metrics {
  totalTasks: number;
  completedTasks: number;
  avgScore: number;
  onTimeRate: number;
}

interface ScoreDistribution {
  range: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgClass: string;
}

interface PriorityDistribution {
  priority: string;
  count: number;
  percentage: number;
  color: string;
  bgClass: string;
  textClass: string;
}

// 分数颜色配置
const getScoreColor = (score: number): { color: string; bgClass: string; textClass: string } => {
  if (score >= 80) {
    return { color: '#00B365', bgClass: 'bg-green-500', textClass: 'text-green-500' };
  } else if (score >= 60) {
    return { color: '#FF7D27', bgClass: 'bg-orange-500', textClass: 'text-orange-500' };
  } else {
    return { color: '#EA4335', bgClass: 'bg-red-500', textClass: 'text-red-500' };
  }
};

// 按时率颜色配置
const getRateColor = (rate: number): { color: string; bgClass: string; textClass: string } => {
  if (rate >= 80) {
    return { color: '#00B365', bgClass: 'bg-green-500', textClass: 'text-green-500' };
  } else if (rate >= 60) {
    return { color: '#FF7D27', bgClass: 'bg-orange-500', textClass: 'text-orange-500' };
  } else {
    return { color: '#EA4335', bgClass: 'bg-red-500', textClass: 'text-red-500' };
  }
};

// 优先级配置
const PRIORITY_CONFIG: Record<string, { color: string; bgClass: string; textClass: string; label: string }> = {
  P0: { color: '#EA4335', bgClass: 'bg-red-500', textClass: 'text-red-500', label: '紧急重要' },
  P1: { color: '#FF7D27', bgClass: 'bg-orange-500', textClass: 'text-orange-500', label: '重要' },
  P2: { color: '#1377EB', bgClass: 'bg-blue-500', textClass: 'text-blue-500', label: '普通' },
  P3: { color: '#9CA3AF', bgClass: 'bg-gray-400', textClass: 'text-gray-400', label: '次要' }
};

// 分数分布配置
const SCORE_DISTRIBUTION_CONFIG: { range: string; label: string; color: string; bgClass: string }[] = [
  { range: '100', label: '100分 (满分)', color: '#00B365', bgClass: 'bg-green-500' },
  { range: '80-99', label: '80-99分 (优秀)', color: '#1377EB', bgClass: 'bg-blue-500' },
  { range: '60-79', label: '60-79分 (合格)', color: '#FF7D27', bgClass: 'bg-orange-500' },
  { range: '0-59', label: '<60分 (待改进)', color: '#EA4335', bgClass: 'bg-red-500' }
];

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

  // 加载统计并缓存
  const loadStats = useCallback(async (forceRefresh = false) => {
    if (!openid) return;

    // 尝试从缓存加载（非强制刷新时）
    if (!forceRefresh && rangeType === 'month') {
      const cached = Taro.getStorageSync('stats_cache_month');
      if (cached) {
        try {
          const cacheData = JSON.parse(cached);
          const cacheTime = cacheData.timestamp;
          // 缓存5分钟有效
          if (Date.now() - cacheTime < 5 * 60 * 1000) {
            setMetrics(cacheData.metrics);
            setScoreDistribution(cacheData.scoreDistribution);
            setPriorityDistribution(cacheData.priorityDistribution);
            return;
          }
        } catch (e) {
          console.error('解析缓存失败:', e);
        }
      }
    }

    setLoading(true);
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const mockMetrics = {
          totalTasks: 15,
          completedTasks: 12,
          avgScore: 85,
          onTimeRate: 80
        };
        const mockScoreDistribution = [
          { range: '100', label: '100分 (满分)', count: 5, percentage: 42, color: '#00B365', bgClass: 'bg-green-500' },
          { range: '80-99', label: '80-99分 (优秀)', count: 4, percentage: 33, color: '#1377EB', bgClass: 'bg-blue-500' },
          { range: '60-79', label: '60-79分 (合格)', count: 2, percentage: 17, color: '#FF7D27', bgClass: 'bg-orange-500' },
          { range: '0-59', label: '<60分 (待改进)', count: 1, percentage: 8, color: '#EA4335', bgClass: 'bg-red-500' }
        ];
        const mockPriorityDistribution = [
          { priority: 'P0', count: 2, percentage: 13, color: '#EA4335', bgClass: 'bg-red-500', textClass: 'text-red-500' },
          { priority: 'P1', count: 5, percentage: 33, color: '#FF7D27', bgClass: 'bg-orange-500', textClass: 'text-orange-500' },
          { priority: 'P2', count: 6, percentage: 40, color: '#1377EB', bgClass: 'bg-blue-500', textClass: 'text-blue-500' },
          { priority: 'P3', count: 2, percentage: 14, color: '#9CA3AF', bgClass: 'bg-gray-400', textClass: 'text-gray-400' }
        ];
        
        setMetrics(mockMetrics);
        setScoreDistribution(mockScoreDistribution);
        setPriorityDistribution(mockPriorityDistribution);
        
        // 缓存数据
        Taro.setStorageSync('stats_cache_month', JSON.stringify({
          metrics: mockMetrics,
          scoreDistribution: mockScoreDistribution,
          priorityDistribution: mockPriorityDistribution,
          timestamp: Date.now()
        }));
        
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
        
        // 缓存数据
        if (rangeType === 'month') {
          Taro.setStorageSync('stats_cache_month', JSON.stringify({
            metrics: res.data.metrics,
            scoreDistribution: res.data.scoreDistribution,
            priorityDistribution: res.data.priorityDistribution,
            timestamp: Date.now()
          }));
        }
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

  // 获取分数颜色
  const avgScoreStyle = getScoreColor(metrics.avgScore);
  const onTimeRateStyle = getRateColor(metrics.onTimeRate);
  const completionRateStyle = getRateColor(completionRate);

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
                  <View className="flex items-center gap-1">
                    <Text className="text-white text-xs font-semibold">{completionRate}%</Text>
                    {completionRate >= 80 && <Text className="text-xs">✨</Text>}
                  </View>
                </View>
                <View className="h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
                  <View 
                    className={`h-full rounded-full transition-all ${completionRateStyle.bgClass}`}
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
                  <View className={`w-10 h-10 rounded-xl flex items-center justify-center ${avgScoreStyle.bgClass} bg-opacity-10`} style={{ backgroundColor: `${avgScoreStyle.color}15` }}>
                    <Award size={20} color={avgScoreStyle.color} />
                  </View>
                  <View>
                    <Text className="text-xs text-gray-400">平均分</Text>
                    <View className="flex items-baseline gap-1">
                      <Text className={`text-xl font-bold ${avgScoreStyle.textClass}`}>{metrics.avgScore}</Text>
                      {metrics.avgScore >= 80 && <Text className="text-xs">⭐</Text>}
                      {metrics.avgScore >= 90 && <Text className="text-xs">⭐</Text>}
                    </View>
                  </View>
                </View>
                {/* 分数等级指示条 */}
                <View className="mt-3 flex gap-1">
                  <View className={`flex-1 h-1 rounded-full ${metrics.avgScore < 60 ? 'bg-red-500' : 'bg-gray-200'}`} />
                  <View className={`flex-1 h-1 rounded-full ${metrics.avgScore >= 60 && metrics.avgScore < 80 ? 'bg-orange-500' : metrics.avgScore >= 80 ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <View className={`flex-1 h-1 rounded-full ${metrics.avgScore >= 80 ? 'bg-green-500' : 'bg-gray-200'}`} />
                </View>
              </CardContent>
            </Card>

            {/* 按时率 */}
            <Card>
              <CardContent className="p-4">
                <View className="flex items-center gap-3">
                  <View className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${onTimeRateStyle.color}15` }}>
                    <Clock size={20} color={onTimeRateStyle.color} />
                  </View>
                  <View>
                    <Text className="text-xs text-gray-400">按时率</Text>
                    <View className="flex items-baseline gap-1">
                      <Text className={`text-xl font-bold ${onTimeRateStyle.textClass}`}>{metrics.onTimeRate}分</Text>
                      {metrics.onTimeRate >= 80 && <Text className="text-xs">✓</Text>}
                    </View>
                  </View>
                </View>
                {/* 按时率指示条 */}
                <View className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View 
                    className={`h-full rounded-full transition-all ${onTimeRateStyle.bgClass}`}
                    style={{ width: `${metrics.onTimeRate}%` }}
                  />
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
                          <Text className="text-sm text-gray-600">{item.label}</Text>
                        </View>
                        <View className="flex items-center gap-2">
                          <Text className="text-sm font-medium text-gray-800">{item.count}个</Text>
                          <View 
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${item.color}15` }}
                          >
                            <Text className="text-xs font-medium" style={{ color: item.color }}>{item.percentage}%</Text>
                          </View>
                        </View>
                      </View>
                      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full transition-all"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </View>
                    </View>
                  ))}
                  
                  {/* 分数图例说明 */}
                  <View className="mt-4 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-400 mb-2">分数说明：</Text>
                    <View className="flex flex-wrap gap-2">
                      {SCORE_DISTRIBUTION_CONFIG.map((config) => (
                        <View key={config.range} className="flex items-center gap-1">
                          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                          <Text className="text-xs text-gray-500">{config.range}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
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
                <View className="space-y-3">
                  {priorityDistribution.map((item) => {
                    const config = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.P2;
                    
                    return (
                      <View key={item.priority}>
                        <View className="flex items-center justify-between mb-1">
                          <View className="flex items-center gap-2">
                            <Badge className={`px-2 ${config.bgClass} bg-opacity-10`} style={{ backgroundColor: `${config.color}15` }}>
                              <Text style={{ color: config.color }}>{item.priority}</Text>
                            </Badge>
                            <Text className="text-xs text-gray-500">{config.label}</Text>
                          </View>
                          <View className="flex items-center gap-2">
                            <Text className="text-sm font-medium text-gray-800">{item.count}个</Text>
                            <View 
                              className="px-2 py-1 rounded-full"
                              style={{ backgroundColor: `${config.color}15` }}
                            >
                              <Text className="text-xs font-medium" style={{ color: config.color }}>{item.percentage}%</Text>
                            </View>
                          </View>
                        </View>
                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <View
                            className="h-full rounded-full transition-all"
                            style={{ width: `${item.percentage}%`, backgroundColor: config.color }}
                          />
                        </View>
                      </View>
                    );
                  })}
                  
                  {/* 优先级图例说明 */}
                  <View className="mt-4 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-400 mb-2">优先级说明：</Text>
                    <View className="flex flex-wrap gap-3">
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <View key={key} className="flex items-center gap-1">
                          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                          <Text className="text-xs text-gray-500">{key} {config.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
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
            onClick={() => loadStats(true)}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新数据'}
          </Button>
        </View>

        {/* 底部占位 */}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
