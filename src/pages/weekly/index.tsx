import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import { Task, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, TrendingUp, Lightbulb, CircleAlert, CircleCheck, ChartBar } from 'lucide-react-taro';

interface TaskWithReview extends Task {
  learnings?: string;
  delay_reason?: string;
  improvements?: string;
  attribution_tags?: string[];
}

interface WeeklyAnalysis {
  totalTasks: number;
  completedTasks: number;
  perfectTasks: number; // 100分任务
  reviewTasks: number; // 需要复盘的任务（不足100分）
  avgScore: number;
  
  // 复盘分析
  commonLearnings: string[]; // 常见的学习收获
  commonIssues: string[]; // 常见的问题/缺陷
  commonImprovements: string[]; // 常见的改进措施
  tagDistribution: { tag: string; count: number }[]; // 归因标签分布
  
  // 任务列表
  tasks: TaskWithReview[];
}

// 归因标签名称映射
const TAG_NAMES: Record<string, string> = {
  time: '时间管理',
  skill: '技能不足',
  resource: '资源不足',
  communication: '沟通问题',
  priority: '优先级错误',
  external: '外部因素'
};

export default function Weekly() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyAnalysis | null>(null);
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });

  // 计算本周日期范围
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setWeekRange({
      start: formatDate(monday),
      end: formatDate(sunday)
    });
  }, []);

  const loadWeekly = useCallback(async () => {
    if (!openid) return;

    setLoading(true);
    try {
      // H5 端模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setWeeklyData({
          totalTasks: 8,
          completedTasks: 7,
          perfectTasks: 3,
          reviewTasks: 4,
          avgScore: 82,
          commonLearnings: [
            '学会了使用新的项目管理工具',
            '掌握了跨部门沟通技巧',
            '提升了文档编写能力'
          ],
          commonIssues: [
            '任务评估时间不足',
            '跨部门协作响应慢',
            '需求变更频繁'
          ],
          commonImprovements: [
            '提前进行任务拆分和时间评估',
            '建立更有效的沟通机制',
            '需求确认后再开始开发'
          ],
          tagDistribution: [
            { tag: '时间管理', count: 3 },
            { tag: '沟通问题', count: 2 },
            { tag: '外部因素', count: 1 }
          ],
          tasks: [
            {
              _id: '1',
              task_id: '1',
              task_name: '完成项目文档编写',
              status: 'completed',
              priority: 'P1',
              publisher_id: openid || '',
              require_date: '2026-03-25',
              score: 80,
              learnings: '学会了使用新的文档工具，提高了编写效率',
              delay_reason: '',
              improvements: '可以提前规划文档结构，避免返工',
              attribution_tags: ['time'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              _id: '2',
              task_id: '2',
              task_name: '接口开发任务',
              status: 'completed',
              priority: 'P0',
              publisher_id: openid || '',
              require_date: '2026-03-24',
              score: 60,
              learnings: '学习了新的API设计模式',
              delay_reason: '需求中途变更，导致开发延期',
              improvements: '需要加强需求确认环节',
              attribution_tags: ['communication', 'priority'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        });
        setLoading(false);
        return;
      }

      const res = await callFunction<CloudResponse<WeeklyAnalysis>>(
        'task-weekly-analysis',
        { week_start: weekRange.start, week_end: weekRange.end }
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
  }, [openid, weekRange]);

  useEffect(() => {
    if (weekRange.start && openid) {
      loadWeekly();
    }
  }, [loadWeekly, weekRange, openid]);

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 100) return 'text-green-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-4">
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
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
          <View className="flex items-center gap-2 mb-2">
            <Calendar size={20} color="#ffffff" />
            <Text className="text-xl text-white font-bold">本周复盘报告</Text>
          </View>
          <Text className="text-blue-100 text-sm">
            {weekRange.start} 至 {weekRange.end}
          </Text>
        </View>

        {/* 核心指标 */}
        <View className="px-4 -mt-4">
          <Card>
            <CardContent className="p-4">
              <View className="grid grid-cols-4 gap-2">
                <View className="flex flex-col items-center">
                  <Text className="text-2xl font-bold text-gray-800">{weeklyData.totalTasks}</Text>
                  <Text className="text-xs text-gray-500">总任务</Text>
                </View>
                <View className="flex flex-col items-center">
                  <Text className="text-2xl font-bold text-green-500">{weeklyData.completedTasks}</Text>
                  <Text className="text-xs text-gray-500">已完成</Text>
                </View>
                <View className="flex flex-col items-center">
                  <Text className="text-2xl font-bold text-blue-500">{weeklyData.perfectTasks}</Text>
                  <Text className="text-xs text-gray-500">满分</Text>
                </View>
                <View className="flex flex-col items-center">
                  <Text className="text-2xl font-bold text-orange-500">{weeklyData.avgScore}</Text>
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

        {/* 复盘任务概览 */}
        <View className="px-4 mt-4">
          <View className="flex items-center gap-2 mb-3">
            <ChartBar size={18} color="#1377EB" />
            <Text className="text-base font-semibold text-gray-800">复盘任务概览</Text>
            <Badge className="bg-orange-50 text-orange-500">{weeklyData.reviewTasks}项</Badge>
          </View>

          {weeklyData.tasks.length > 0 ? (
            weeklyData.tasks.map((task) => (
              <Card key={task._id} className="mb-3">
                <CardContent className="p-4">
                  <View className="flex items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">{task.task_name}</Text>
                      <View className="flex items-center gap-2 mt-1">
                        <Badge className="bg-gray-100 text-gray-600">{task.priority}</Badge>
                        <Text className="text-xs text-gray-400">截止：{task.require_date}</Text>
                      </View>
                    </View>
                    <Text className={`text-lg font-bold ${getScoreColor(task.score || 0)}`}>
                      {task.score}分
                    </Text>
                  </View>

                  {/* 复盘内容 */}
                  {task.learnings && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                      <View className="flex items-start gap-2">
                        <Lightbulb size={14} color="#1377EB" className="mt-1" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 mb-1">学习收获</Text>
                          <Text className="text-sm text-gray-700">{task.learnings}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {task.delay_reason && (
                    <View className="mt-2">
                      <View className="flex items-start gap-2">
                        <CircleAlert size={14} color="#F97316" className="mt-1" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 mb-1">延迟原因</Text>
                          <Text className="text-sm text-gray-700">{task.delay_reason}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {task.improvements && (
                    <View className="mt-2">
                      <View className="flex items-start gap-2">
                        <CircleCheck size={14} color="#22C55E" className="mt-1" />
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 mb-1">改进措施</Text>
                          <Text className="text-sm text-gray-700">{task.improvements}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* 归因标签 */}
                  {task.attribution_tags && task.attribution_tags.length > 0 && (
                    <View className="flex flex-wrap gap-1 mt-3">
                      {task.attribution_tags.map((tag) => (
                        <Badge key={tag} className="bg-blue-50 text-blue-600 text-xs">
                          {TAG_NAMES[tag] || tag}
                        </Badge>
                      ))}
                    </View>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4">
                <Text className="text-gray-400 text-center">本周暂无需要复盘的任务</Text>
              </CardContent>
            </Card>
          )}
        </View>

        {/* 周度分析总结 */}
        {weeklyData.reviewTasks > 0 && (
          <>
            {/* 常见问题 */}
            <View className="px-4 mt-4">
              <View className="flex items-center gap-2 mb-3">
                <CircleAlert size={18} color="#F97316" />
                <Text className="text-base font-semibold text-gray-800">本周问题总结</Text>
              </View>
              <Card>
                <CardContent className="p-4">
                  {weeklyData.commonIssues.length > 0 ? (
                    weeklyData.commonIssues.map((issue, index) => (
                      <View key={index} className="flex items-start gap-2 mb-2 last:mb-0">
                        <Text className="text-orange-500 text-sm">•</Text>
                        <Text className="text-sm text-gray-700 flex-1">{issue}</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-gray-400 text-sm">暂无问题记录</Text>
                  )}
                </CardContent>
              </Card>
            </View>

            {/* 归因分析 */}
            <View className="px-4 mt-4">
              <View className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} color="#1377EB" />
                <Text className="text-base font-semibold text-gray-800">归因分析</Text>
              </View>
              <Card>
                <CardContent className="p-4">
                  {weeklyData.tagDistribution.length > 0 ? (
                    weeklyData.tagDistribution.map((item) => (
                      <View key={item.tag} className="flex items-center justify-between mb-2 last:mb-0">
                        <Text className="text-sm text-gray-700">{item.tag}</Text>
                        <Badge className="bg-gray-100 text-gray-600">{item.count}次</Badge>
                      </View>
                    ))
                  ) : (
                    <Text className="text-gray-400 text-sm">暂无归因数据</Text>
                  )}
                </CardContent>
              </Card>
            </View>

            {/* 改进建议 */}
            <View className="px-4 mt-4">
              <View className="flex items-center gap-2 mb-3">
                <Lightbulb size={18} color="#22C55E" />
                <Text className="text-base font-semibold text-gray-800">下周改进建议</Text>
              </View>
              <Card className="bg-green-50 border border-green-200">
                <CardContent className="p-4">
                  {weeklyData.commonImprovements.length > 0 ? (
                    weeklyData.commonImprovements.map((improvement, index) => (
                      <View key={index} className="flex items-start gap-2 mb-2 last:mb-0">
                        <CircleCheck size={14} color="#22C55E" className="mt-1" />
                        <Text className="text-sm text-gray-700 flex-1">{improvement}</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-gray-400 text-sm">继续保持良好状态</Text>
                  )}
                </CardContent>
              </Card>
            </View>
          </>
        )}

        {/* 提示信息 */}
        <View className="px-4 mt-4 mb-20">
          <View className="bg-blue-50 rounded-lg p-3">
            <Text className="text-xs text-blue-500">
              💡 周报基于本周完成且评分不足100分的任务自动生成，帮助总结经验、发现问题、持续改进。
            </Text>
          </View>
        </View>

        {/* 底部占位 */}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
