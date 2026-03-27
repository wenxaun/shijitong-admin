import { View, Text, Picker } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import { Task, TaskPriority, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// 优先级配置
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'P0', label: 'P0 - 紧急重要' },
  { value: 'P1', label: 'P1 - 重要' },
  { value: 'P2', label: 'P2 - 普通' },
  { value: 'P3', label: 'P3 - 次要' }
];

// 归因选项
const ATTRIBUTION_OPTIONS = [
  '时间预估不足',
  '需求变更',
  '资源不足',
  '技术难点',
  '沟通问题',
  '其他'
];

interface Executor {
  id: string;
  openid: string;
  name: string;
}

export default function Edit() {
  const router = useRouter();
  const { openid } = useUserStore();
  const taskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 表单字段
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P1');
  const [category, setCategory] = useState('');
  const [requireDate, setRequireDate] = useState('');
  const [executorList, setExecutorList] = useState<Executor[]>([]);
  const [executorIndex, setExecutorIndex] = useState(-1);

  // 复盘字段
  const [isOverdue, setIsOverdue] = useState(false);
  const [learnings, setLearnings] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [improvements, setImprovements] = useState('');
  const [attributionTags, setAttributionTags] = useState<string[]>([]);

  // 加载任务
  useEffect(() => {
    if (taskId) {
      loadTask();
      loadExecutors();
    }
  }, [taskId]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ task: Task }>>(
        'task-detail',
        { task_id: taskId }
      );

      if (res.success && res.data?.task) {
        const task = res.data.task;

        // 权限检查
        const isPublisher = task.publisher_id === openid;
        const isExecutor = task.executor_id === openid;
        if (!isPublisher && !isExecutor) {
          Taro.showToast({ title: '无权限编辑', icon: 'none' });
          setTimeout(() => Taro.navigateBack(), 1500);
          return;
        }

        // 检查是否逾期
        const overdue = !!(task.require_date && new Date(task.require_date) < new Date() && task.status !== 'completed');

        setTaskName(task.task_name);
        setTaskDescription(task.task_description || '');
        setPriority(task.priority);
        setCategory(task.category || '');
        setRequireDate(task.require_date);
        setIsOverdue(overdue);
        setLearnings(task.learnings || '');
        setDelayReason(task.delay_reason || '');
        setImprovements(task.improvements || '');
        setAttributionTags(task.attribution_tags || []);
      } else {
        Taro.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(() => Taro.navigateBack(), 1500);
      }
    } catch (err) {
      console.error('加载失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const loadExecutors = async () => {
    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setExecutorList([
          { id: '1', openid: 'test1', name: '测试用户1' },
          { id: '2', openid: 'test2', name: '测试用户2' }
        ]);
        return;
      }

      // @ts-ignore
      const db = wx.cloud.database();
      const res = await db.collection('users').orderBy('created_at', 'asc').get();
      const users = res.data.map((u: any) => ({
        id: u._id,
        openid: u.openid,
        name: u.nickname || '微信用户'
      }));
      setExecutorList(users);
    } catch (err) {
      console.error('加载用户列表失败:', err);
    }
  };

  // 切换归因标签
  const toggleAttribution = (tag: string) => {
    if (attributionTags.includes(tag)) {
      setAttributionTags(attributionTags.filter(t => t !== tag));
    } else {
      setAttributionTags([...attributionTags, tag]);
    }
  };

  // 提交编辑
  const submitEdit = async () => {
    // 验证
    if (!taskName.trim()) {
      Taro.showToast({ title: '请输入任务名称', icon: 'none' });
      return;
    }
    if (!requireDate) {
      Taro.showToast({ title: '请选择要求完成日期', icon: 'none' });
      return;
    }

    // 逾期任务验证复盘字段
    if (isOverdue) {
      if (!learnings.trim()) {
        Taro.showToast({ title: '请填写学习收获', icon: 'none' });
        return;
      }
      if (!delayReason.trim()) {
        Taro.showToast({ title: '请填写延迟原因', icon: 'none' });
        return;
      }
      if (!improvements.trim()) {
        Taro.showToast({ title: '请填写反思改进', icon: 'none' });
        return;
      }
      if (attributionTags.length === 0) {
        Taro.showToast({ title: '请选择归因分类', icon: 'none' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const executorId = executorIndex >= 0 ? executorList[executorIndex].openid : null;

      const updateData: any = {
        task_id: taskId,
        task_name: taskName.trim(),
        task_description: taskDescription.trim(),
        priority,
        category: category.trim(),
        executor_id: executorId,
        require_date: requireDate
      };

      // 逾期任务添加复盘字段
      if (isOverdue) {
        updateData.learnings = learnings.trim();
        updateData.delay_reason = delayReason.trim();
        updateData.improvements = improvements.trim();
        updateData.attribution_tags = attributionTags;
      }

      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.TASK_UPDATE,
        updateData
      );

      if (res.success) {
        Taro.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('更新失败:', err);
      Taro.showToast({ title: '更新失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-gray-50">
        <Text className="text-gray-400">加载中...</Text>
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-gray-50 pb-20">
      <View className="p-3 space-y-3">
        {/* 任务名称 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2 flex items-center">
              <Text className="text-red-500 mr-1">*</Text>
              <Text>任务名称</Text>
            </Label>
            <Input
              placeholder="请输入任务名称"
              placeholderClass="text-gray-400"
              value={taskName}
              onInput={(e) => setTaskName(e.detail.value)}
              maxlength={50}
              className="bg-gray-50 border-gray-200 h-10"
            />
          </CardContent>
        </Card>

        {/* 任务描述 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2">任务描述</Label>
            <Textarea
              placeholder="请输入任务描述（可选）"
              placeholderClass="text-gray-400"
              value={taskDescription}
              onInput={(e) => setTaskDescription(e.detail.value)}
              maxlength={500}
              className="bg-gray-50 border-gray-200 h-24"
              style={{ minHeight: '96px' }}
            />
          </CardContent>
        </Card>

        {/* 优先级 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-3">优先级</Label>
            <View className="space-y-2">
              {PRIORITY_OPTIONS.map((item) => (
                <View
                  key={item.value}
                  className={`flex items-center p-3 rounded-lg border-2 ${
                    priority === item.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => setPriority(item.value)}
                >
                  <Text className={priority === item.value ? 'text-blue-600' : 'text-gray-600'}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* 分类 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2">分类</Label>
            <Input
              placeholder="请输入分类"
              placeholderClass="text-gray-400"
              value={category}
              onInput={(e) => setCategory(e.detail.value)}
              maxlength={20}
              className="bg-gray-50 border-gray-200 h-10"
            />
          </CardContent>
        </Card>

        {/* 要求完成日期 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2 flex items-center">
              <Text className="text-red-500 mr-1">*</Text>
              <Text>要求完成日期</Text>
            </Label>
            <Picker mode="date" value={requireDate} onChange={(e) => setRequireDate(e.detail.value)}>
              <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                <Text className={requireDate ? 'text-gray-800' : 'text-gray-400'}>
                  {requireDate || '选择日期'}
                </Text>
                <Text className="text-gray-400">📅</Text>
              </View>
            </Picker>
          </CardContent>
        </Card>

        {/* 执行人 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2">执行人</Label>
            <Picker
              mode="selector"
              range={executorList}
              rangeKey="name"
              value={executorIndex >= 0 ? executorIndex : 0}
              onChange={(e) => setExecutorIndex(parseInt(String(e.detail.value)))}
            >
              <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                <Text className={executorIndex >= 0 ? 'text-gray-800' : 'text-gray-400'}>
                  {executorIndex >= 0 ? executorList[executorIndex].name : '选择执行人'}
                </Text>
                <Text className="text-gray-400">▼</Text>
              </View>
            </Picker>
          </CardContent>
        </Card>

        {/* 复盘字段（逾期任务） */}
        {isOverdue && (
          <View className="space-y-3">
            <View className="flex items-center justify-center py-2">
              <Text className="text-base font-semibold text-orange-500">📝 复盘反思（逾期必填）</Text>
            </View>

            <Card>
              <CardContent className="p-3">
                <Label className="text-sm text-gray-500 mb-2 flex items-center">
                  <Text className="text-red-500 mr-1">*</Text>
                  <Text>学习收获</Text>
                </Label>
                <Textarea
                  placeholder="通过本次任务学到了什么？"
                  placeholderClass="text-gray-400"
                  value={learnings}
                  onInput={(e) => setLearnings(e.detail.value)}
                  maxlength={500}
                  className="bg-gray-50 border-gray-200 h-24"
                  style={{ minHeight: '96px' }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <Label className="text-sm text-gray-500 mb-2 flex items-center">
                  <Text className="text-red-500 mr-1">*</Text>
                  <Text>延迟原因</Text>
                </Label>
                <Textarea
                  placeholder="为什么延迟了？"
                  placeholderClass="text-gray-400"
                  value={delayReason}
                  onInput={(e) => setDelayReason(e.detail.value)}
                  maxlength={500}
                  className="bg-gray-50 border-gray-200 h-24"
                  style={{ minHeight: '96px' }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <Label className="text-sm text-gray-500 mb-2 flex items-center">
                  <Text className="text-red-500 mr-1">*</Text>
                  <Text>反思改进</Text>
                </Label>
                <Textarea
                  placeholder="下次如何改进？"
                  placeholderClass="text-gray-400"
                  value={improvements}
                  onInput={(e) => setImprovements(e.detail.value)}
                  maxlength={500}
                  className="bg-gray-50 border-gray-200 h-24"
                  style={{ minHeight: '96px' }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <Label className="text-sm text-gray-500 mb-2 flex items-center">
                  <Text className="text-red-500 mr-1">*</Text>
                  <Text>归因分类</Text>
                </Label>
                <View className="flex flex-wrap gap-2">
                  {ATTRIBUTION_OPTIONS.map((tag) => (
                    <Badge
                      key={tag}
                      className={`cursor-pointer ${
                        attributionTags.includes(tag)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      onClick={() => toggleAttribution(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* 提交按钮 */}
        <Button
          className="w-full bg-blue-500 text-white rounded-lg py-3 text-base font-semibold"
          onClick={submitEdit}
          disabled={submitting}
        >
          {submitting ? '保存中...' : '保存修改'}
        </Button>
      </View>
    </View>
  );
}
