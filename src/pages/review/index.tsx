import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { Task, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Lightbulb, CircleAlert, Check, Clock, CircleCheck } from 'lucide-react-taro';

// 归因标签选项
const ATTRIBUTION_TAGS = [
  { id: 'time', label: '时间管理' },
  { id: 'skill', label: '技能不足' },
  { id: 'resource', label: '资源不足' },
  { id: 'communication', label: '沟通问题' },
  { id: 'priority', label: '优先级错误' },
  { id: 'external', label: '外部因素' }
];

// 计算自动评分
const calculateScore = (
  isOverdue: boolean,
  delayDays: number,
  subtaskProgress: number,
  hasSubtasks: boolean
): number => {
  let score = 100;

  // 逾期扣分
  if (isOverdue) {
    if (delayDays <= 1) {
      score -= 5; // 逾期1天扣5分
    } else if (delayDays <= 3) {
      score -= 10; // 逾期2-3天扣10分
    } else if (delayDays <= 7) {
      score -= 15; // 逾期4-7天扣15分
    } else {
      score -= 20; // 逾期超过7天扣20分
    }
  }

  // 子任务完成率扣分（仅当有子任务时）
  if (hasSubtasks && subtaskProgress < 100) {
    const incompleteRate = (100 - subtaskProgress) / 100;
    score -= Math.round(incompleteRate * 10); // 未完成比例 * 10，最多扣10分
  }

  // 确保分数在 0-100 之间
  return Math.max(0, Math.min(100, score));
};

// 获取评分等级
const getScoreLevel = (score: number) => {
  if (score >= 90) return { label: '优秀', color: 'text-green-500', bg: 'bg-green-50' };
  if (score >= 80) return { label: '良好', color: 'text-blue-500', bg: 'bg-blue-50' };
  if (score >= 60) return { label: '合格', color: 'text-orange-500', bg: 'bg-orange-50' };
  return { label: '待改进', color: 'text-red-500', bg: 'bg-red-50' };
};

export default function Review() {
  const router = useRouter();
  const { openid } = useUserStore();
  const taskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [delayDays, setDelayDays] = useState(0);
  const [calculatedScore, setCalculatedScore] = useState(100);
  const [subtaskProgress, setSubtaskProgress] = useState(100);

  // 复盘表单
  const [learnings, setLearnings] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [improvements, setImprovements] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 加载任务详情
  const loadTask = useCallback(async () => {
    if (!taskId || !openid) return;

    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ task: Task }>>(
        'task-detail',
        { task_id: taskId }
      );

      if (res.success && res.data?.task) {
        const taskData = res.data.task;
        setTask(taskData);

        // 检查是否逾期
        if (taskData.require_date) {
          const requireDate = new Date(taskData.require_date);
          const completeDate = taskData.complete_date ? new Date(taskData.complete_date) : new Date();
          
          requireDate.setHours(0, 0, 0, 0);
          completeDate.setHours(0, 0, 0, 0);
          
          const diffTime = completeDate.getTime() - requireDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setIsOverdue(diffDays > 0);
          setDelayDays(Math.max(0, diffDays));
        }

        // 如果已有复盘数据，填充表单
        if (taskData.learnings) setLearnings(taskData.learnings);
        if (taskData.delay_reason) setDelayReason(taskData.delay_reason);
        if (taskData.improvements) setImprovements(taskData.improvements);
        if (taskData.attribution_tags) setSelectedTags(taskData.attribution_tags);
      }
    } catch (err) {
      console.error('加载任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [taskId, openid]);

  // 加载子任务进度
  const loadSubtaskProgress = useCallback(async () => {
    if (!taskId) return;

    try {
      const res = await callFunction<CloudResponse<{ subtasks: any[] }>>(
        CLOUD_FUNCTIONS.SUBTASK_LIST,
        { parent_task_id: taskId }
      );

      if (res.success && res.data?.subtasks) {
        const subtasks = res.data.subtasks;
        if (subtasks.length > 0) {
          const completed = subtasks.filter(s => s.status === 'completed').length;
          const progress = Math.round((completed / subtasks.length) * 100);
          setSubtaskProgress(progress);
        }
      }
    } catch (err) {
      console.error('加载子任务失败:', err);
    }
  }, [taskId]);

  // 计算评分
  useEffect(() => {
    const score = calculateScore(isOverdue, delayDays, subtaskProgress, subtaskProgress < 100);
    setCalculatedScore(score);
  }, [isOverdue, delayDays, subtaskProgress]);

  useEffect(() => {
    loadTask();
    loadSubtaskProgress();
  }, [loadTask, loadSubtaskProgress]);

  // 切换归因标签
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  // 提交复盘和评分
  const submitReview = async () => {
    if (!learnings.trim()) {
      Taro.showToast({ title: '请填写学习收获', icon: 'none' });
      return;
    }

    if (isOverdue && !delayReason.trim()) {
      Taro.showToast({ title: '请填写延迟原因', icon: 'none' });
      return;
    }

    if (!improvements.trim()) {
      Taro.showToast({ title: '请填写反思改进', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.TASK_UPDATE,
        {
          task_id: taskId,
          learnings: learnings.trim(),
          delay_reason: isOverdue ? delayReason.trim() : '',
          improvements: improvements.trim(),
          attribution_tags: selectedTags,
          score: calculatedScore,
          score_note: getScoreNote()
        }
      );

      if (res.success) {
        Taro.showToast({ title: '复盘提交成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (err) {
      console.error('提交复盘失败:', err);
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 生成评分说明
  const getScoreNote = () => {
    const notes: string[] = [];
    
    if (isOverdue) {
      notes.push(`逾期${delayDays}天完成`);
    } else {
      notes.push('按时完成');
    }
    
    if (subtaskProgress < 100) {
      notes.push(`子任务完成率${subtaskProgress}%`);
    }
    
    return notes.join('；');
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

  if (!task) {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Text className="text-gray-400">任务不存在</Text>
      </View>
    );
  }

  const scoreLevel = getScoreLevel(calculatedScore);

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="h-screen" scrollY>
        {/* 任务信息 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <Text className="text-lg font-bold text-gray-800 mb-2">{task.task_name}</Text>
            <View className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-green-50 text-green-600">已完成</Badge>
              {isOverdue && (
                <Badge className="bg-orange-50 text-orange-600">逾期{delayDays}天</Badge>
              )}
              <Text className="text-sm text-gray-500">截止：{task.require_date}</Text>
            </View>
          </CardContent>
        </Card>

        {/* 自动评分展示 */}
        <View className="mx-3 mt-4 mb-2">
          <Text className="text-base font-semibold text-gray-800">自动评分</Text>
          <Text className="text-xs text-gray-400">系统根据任务完成情况自动计算</Text>
        </View>

        <Card className="mx-3">
          <CardContent className="p-4">
            <View className="flex items-center justify-center mb-4">
              <View className={`w-24 h-24 rounded-full flex items-center justify-center ${scoreLevel.bg}`}>
                <Text className={`text-3xl font-bold ${scoreLevel.color}`}>{calculatedScore}</Text>
              </View>
            </View>
            <View className="flex items-center justify-center mb-4">
              <Text className={`text-lg font-semibold ${scoreLevel.color}`}>{scoreLevel.label}</Text>
            </View>

            {/* 评分明细 */}
            <View className="bg-gray-50 rounded-lg p-3 space-y-2">
              <View className="flex items-center justify-between">
                <View className="flex items-center">
                  <Clock size={16} color={isOverdue ? '#F97316' : '#22C55E'} />
                  <Text className="text-sm text-gray-600 ml-2">完成时效</Text>
                </View>
                <Text className={`text-sm ${isOverdue ? 'text-orange-500' : 'text-green-500'}`}>
                  {isOverdue ? `逾期${delayDays}天` : '按时完成'}
                </Text>
              </View>
              
              {subtaskProgress < 100 && (
                <View className="flex items-center justify-between">
                  <View className="flex items-center">
                    <CircleCheck size={16} color="#F97316" />
                    <Text className="text-sm text-gray-600 ml-2">子任务完成率</Text>
                  </View>
                  <Text className="text-sm text-orange-500">{subtaskProgress}%</Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>

        {/* 复盘表单 */}
        <View className="mx-3 mt-4 mb-2">
          <Text className="text-base font-semibold text-gray-800">任务复盘</Text>
          <Text className="text-xs text-gray-400">完成任务后请填写复盘内容</Text>
        </View>

        {/* 学习收获 */}
        <Card className="mx-3">
          <CardContent className="p-4">
            <View className="flex items-center mb-2">
              <Lightbulb size={18} color="#1377EB" />
              <Text className="text-sm font-semibold text-gray-700 ml-2">学习收获 *</Text>
            </View>
            <View className="bg-gray-50 rounded-xl p-3">
              <Textarea
                style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                placeholder="记录这次任务中学到的知识、技能或经验..."
                value={learnings}
                onInput={(e) => setLearnings(e.detail.value)}
                maxlength={500}
              />
            </View>
            <Text className="text-xs text-gray-400 mt-1 text-right">{learnings.length}/500</Text>
          </CardContent>
        </Card>

        {/* 延迟原因（逾期必填） */}
        {isOverdue && (
          <Card className="mx-3 mt-3">
            <CardContent className="p-4">
              <View className="flex items-center mb-2">
                <CircleAlert size={18} color="#F97316" />
                <Text className="text-sm font-semibold text-gray-700 ml-2">延迟原因 *</Text>
              </View>
              <View className="bg-orange-50 rounded-xl p-3 mb-2">
                <Text className="text-xs text-orange-600">
                  该任务逾期完成，请说明延迟原因
                </Text>
              </View>
              <View className="bg-gray-50 rounded-xl p-3">
                <Textarea
                  style={{ width: '100%', minHeight: '60px', backgroundColor: 'transparent' }}
                  placeholder="说明任务延迟的具体原因..."
                  value={delayReason}
                  onInput={(e) => setDelayReason(e.detail.value)}
                  maxlength={300}
                />
              </View>
            </CardContent>
          </Card>
        )}

        {/* 反思改进 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <View className="flex items-center mb-2">
              <Check size={18} color="#22C55E" />
              <Text className="text-sm font-semibold text-gray-700 ml-2">反思改进 *</Text>
            </View>
            <View className="bg-gray-50 rounded-xl p-3">
              <Textarea
                style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                placeholder="总结经验教训，提出改进措施..."
                value={improvements}
                onInput={(e) => setImprovements(e.detail.value)}
                maxlength={500}
              />
            </View>
          </CardContent>
        </Card>

        {/* 归因标签 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <Text className="text-sm font-semibold text-gray-700 mb-3">归因标签</Text>
            <View className="flex flex-wrap gap-2">
              {ATTRIBUTION_TAGS.map((tag) => (
                <View
                  key={tag.id}
                  className={`px-3 py-1 rounded-full border ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <Text className={selectedTags.includes(tag.id) ? 'text-white' : 'text-gray-600'}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <View className="mx-3 mt-4 mb-20">
          <Button
            className="w-full bg-blue-500 text-white py-3"
            onClick={submitReview}
            disabled={submitting}
          >
            <Award size={16} color="#ffffff" />
            <Text className="text-white ml-2">{submitting ? '提交中...' : '提交复盘'}</Text>
          </Button>
        </View>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
