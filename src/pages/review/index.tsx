import { View, Text, ScrollView, Picker } from '@tarojs/components';
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
import { Award, Lightbulb, CircleAlert, Check } from 'lucide-react-taro';

// 评分等级配置
const SCORE_LEVELS = [
  { min: 90, label: '优秀', color: 'text-green-500', bg: 'bg-green-50' },
  { min: 80, label: '良好', color: 'text-blue-500', bg: 'bg-blue-50' },
  { min: 60, label: '合格', color: 'text-orange-500', bg: 'bg-orange-50' },
  { min: 0, label: '待改进', color: 'text-red-500', bg: 'bg-red-50' }
];

// 归因标签选项
const ATTRIBUTION_TAGS = [
  { id: 'time', label: '时间管理' },
  { id: 'skill', label: '技能不足' },
  { id: 'resource', label: '资源不足' },
  { id: 'communication', label: '沟通问题' },
  { id: 'priority', label: '优先级错误' },
  { id: 'external', label: '外部因素' }
];

export default function Review() {
  const router = useRouter();
  const { openid } = useUserStore();
  const taskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [isPublisher, setIsPublisher] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);

  // 复盘表单
  const [learnings, setLearnings] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [improvements, setImprovements] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 评分表单
  const [score, setScore] = useState(80);
  const [scoreNote, setScoreNote] = useState('');
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
        setIsPublisher(taskData.publisher_id === openid);

        // 检查是否逾期
        if (taskData.require_date) {
          const requireDate = new Date(taskData.require_date);
          const completeDate = taskData.complete_date ? new Date(taskData.complete_date) : new Date();
          setIsOverdue(completeDate > requireDate);
        }

        // 如果已有复盘数据，填充表单
        if (taskData.learnings) setLearnings(taskData.learnings);
        if (taskData.delay_reason) setDelayReason(taskData.delay_reason);
        if (taskData.improvements) setImprovements(taskData.improvements);
        if (taskData.attribution_tags) setSelectedTags(taskData.attribution_tags);
        if (taskData.score !== null && taskData.score !== undefined) setScore(taskData.score);
        if (taskData.score_note) setScoreNote(taskData.score_note);
      }
    } catch (err) {
      console.error('加载任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [taskId, openid]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // 切换归因标签
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  // 提交复盘
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
          attribution_tags: selectedTags
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

  // 提交评分
  const submitScore = async () => {
    setSubmitting(true);
    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.TASK_UPDATE,
        {
          task_id: taskId,
          score,
          score_note: scoreNote.trim()
        }
      );

      if (res.success) {
        Taro.showToast({ title: '评分成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '评分失败', icon: 'none' });
      }
    } catch (err) {
      console.error('评分失败:', err);
      Taro.showToast({ title: '评分失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 获取评分等级
  const getScoreLevel = (scoreValue: number) => {
    return SCORE_LEVELS.find(level => scoreValue >= level.min) || SCORE_LEVELS[SCORE_LEVELS.length - 1];
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

  const scoreLevel = getScoreLevel(score);

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
                <Badge className="bg-orange-50 text-orange-600">逾期完成</Badge>
              )}
              <Text className="text-sm text-gray-500">截止：{task.require_date}</Text>
            </View>
          </CardContent>
        </Card>

        {/* 执行人复盘区域 */}
        {!isPublisher && (
          <View>
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
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-600'
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
            <View className="mx-3 mt-4 mb-4">
              <Button
                className="w-full bg-blue-500 text-white py-3"
                onClick={submitReview}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '提交复盘'}
              </Button>
            </View>
          </View>
        )}

        {/* 发布人评分区域 */}
        {isPublisher && (
          <View>
            <View className="mx-3 mt-4 mb-2">
              <Text className="text-base font-semibold text-gray-800">任务评分</Text>
              <Text className="text-xs text-gray-400">作为发布人，您可以为任务评分</Text>
            </View>

            {/* 当前评分 */}
            <Card className="mx-3">
              <CardContent className="p-4">
                <View className="flex items-center justify-center mb-4">
                  <View className={`w-24 h-24 rounded-full flex items-center justify-center ${scoreLevel.bg}`}>
                    <Text className={`text-3xl font-bold ${scoreLevel.color}`}>{score}</Text>
                  </View>
                </View>
                <View className="flex items-center justify-center mb-4">
                  <Text className={`text-lg font-semibold ${scoreLevel.color}`}>{scoreLevel.label}</Text>
                </View>

                {/* 评分滑块 */}
                <View className="mb-4">
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-sm text-gray-500">0</Text>
                    <Text className="text-sm text-gray-500">100</Text>
                  </View>
                  <Picker
                    mode="selector"
                    range={Array.from({ length: 101 }, (_, i) => i)}
                    value={score}
                    onChange={(e) => setScore(parseInt(String(e.detail.value)))}
                  >
                    <View className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-200">
                      <Text className="text-gray-800">评分：{score} 分</Text>
                      <Text className="text-gray-400">点击调整</Text>
                    </View>
                  </Picker>
                </View>

                {/* 评分说明 */}
                <View className="mb-2">
                  <Text className="text-sm text-gray-600 mb-2">评分说明（可选）</Text>
                  <View className="bg-gray-50 rounded-xl p-3">
                    <Textarea
                      style={{ width: '100%', minHeight: '60px', backgroundColor: 'transparent' }}
                      placeholder="填写评分说明或建议..."
                      value={scoreNote}
                      onInput={(e) => setScoreNote(e.detail.value)}
                      maxlength={200}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* 已有复盘内容展示 */}
            {(task.learnings || task.delay_reason || task.improvements) && (
              <Card className="mx-3 mt-3">
                <CardContent className="p-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-3">执行人复盘</Text>
                  
                  {task.learnings && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-400 mb-1">学习收获</Text>
                      <Text className="text-sm text-gray-600">{task.learnings}</Text>
                    </View>
                  )}
                  
                  {task.delay_reason && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-400 mb-1">延迟原因</Text>
                      <Text className="text-sm text-gray-600">{task.delay_reason}</Text>
                    </View>
                  )}
                  
                  {task.improvements && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-400 mb-1">反思改进</Text>
                      <Text className="text-sm text-gray-600">{task.improvements}</Text>
                    </View>
                  )}
                  
                  {task.attribution_tags && task.attribution_tags.length > 0 && (
                    <View className="flex flex-wrap gap-2">
                      {task.attribution_tags.map((tagId) => {
                        const tag = ATTRIBUTION_TAGS.find(t => t.id === tagId);
                        return tag ? (
                          <Badge key={tagId} className="bg-blue-50 text-blue-600">{tag.label}</Badge>
                        ) : null;
                      })}
                    </View>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 提交按钮 */}
            <View className="mx-3 mt-4 mb-4">
              <Button
                className="w-full bg-blue-500 text-white py-3"
                onClick={submitScore}
                disabled={submitting}
              >
                <Award size={16} color="#ffffff" />
                <Text className="text-white ml-2">{submitting ? '提交中...' : '确认评分'}</Text>
              </Button>
            </View>
          </View>
        )}

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
