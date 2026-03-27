import { View, Text, Picker } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Executor {
  openid: string;
  nickname: string;
}

export default function SubtaskCreate() {
  const router = useRouter();
  const { openid } = useUserStore();
  const parentTaskId = router.params.id || '';

  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [executorList, setExecutorList] = useState<Executor[]>([]);
  const [executorIndex, setExecutorIndex] = useState(-1);
  const [requireDate, setRequireDate] = useState('');
  const [minDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxDate, setMaxDate] = useState('');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2');
  const [submitting, setSubmitting] = useState(false);

  // 加载主任务截止日期
  const loadParentTaskDeadline = useCallback(async () => {
    if (!parentTaskId) return;

    try {
      const res = await callFunction<{ success: boolean; data?: { task: { require_date?: string } } }>(
        'task-detail',
        { task_id: parentTaskId }
      );

      if (res.success && res.data?.task?.require_date) {
        setMaxDate(res.data.task.require_date);
      } else {
        // 默认截止日期为 30 天后
        setMaxDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('加载主任务截止日期失败:', err);
      // 设置默认截止日期
      setMaxDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    }
  }, [parentTaskId]);

  // 加载团队成员
  const loadTeamMembers = useCallback(async () => {
    if (!openid) return;

    try {
      // 使用统一接口获取团队成员
      const res = await callFunction<{ success: boolean; data?: { members: Executor[] } }>(
        'team-members',
        { openid }
      );

      if (res.success && res.data?.members) {
        setExecutorList(res.data.members);
        if (res.data.members.length > 0) {
          setExecutorIndex(0);
        }
      } else {
        // 默认成员
        setExecutorList([{ openid, nickname: '我' }]);
        setExecutorIndex(0);
      }
    } catch (err) {
      console.error('加载团队成员失败:', err);
      // 默认成员
      setExecutorList([{ openid, nickname: '我' }]);
      setExecutorIndex(0);
    }
  }, [openid]);

  useEffect(() => {
    if (parentTaskId) {
      loadParentTaskDeadline();
    }
    if (openid) {
      loadTeamMembers();
    }
  }, [parentTaskId, openid, loadParentTaskDeadline, loadTeamMembers]);

  // 创建子任务
  const createSubtask = async () => {
    if (!taskName.trim()) {
      Taro.showToast({ title: '请输入任务名称', icon: 'none' });
      return;
    }

    if (!requireDate) {
      Taro.showToast({ title: '请选择截止日期', icon: 'none' });
      return;
    }

    if (executorIndex < 0 || executorList.length === 0) {
      Taro.showToast({ title: '请选择执行人', icon: 'none' });
      return;
    }

    const executor = executorList[executorIndex];

    setSubmitting(true);
    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.SUBTASK_CREATE,
        {
          task_id: parentTaskId,
          title: taskName,
          description: taskDescription,
          executor_id: executor.openid,
          require_date: requireDate,
          priority: priority
        }
      );

      if (res.success) {
        Taro.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '创建失败', icon: 'none' });
      }
    } catch (err) {
      console.error('创建子任务失败:', err);
      Taro.showToast({ title: '创建失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const priorityOptions = [
    { value: 'P0', label: '紧急', color: 'bg-red-100 text-red-600' },
    { value: 'P1', label: '高', color: 'bg-orange-100 text-orange-600' },
    { value: 'P2', label: '中', color: 'bg-blue-100 text-blue-600' },
    { value: 'P3', label: '低', color: 'bg-gray-100 text-gray-600' }
  ];

  return (
    <View className="min-h-screen bg-gray-50">
      <View className="p-3 space-y-3">
        {/* 任务名称 */}
        <Card>
          <CardContent className="p-3">
            <View className="flex items-center mb-2">
              <Text className="text-red-500">*</Text>
              <Text className="text-sm text-gray-700 ml-1">子任务名称</Text>
            </View>
            <Input
              placeholder="请输入子任务名称"
              value={taskName}
              onInput={(e) => setTaskName(e.detail.value)}
              maxlength={50}
            />
          </CardContent>
        </Card>

        {/* 任务描述 */}
        <Card>
          <CardContent className="p-3">
            <Text className="text-sm text-gray-700 mb-2">任务描述</Text>
            <View className="bg-gray-50 rounded-xl p-3">
              <Textarea
                style={{ width: '100%', minHeight: '80px', backgroundColor: 'transparent' }}
                placeholder="请输入任务描述（可选）"
                value={taskDescription}
                onInput={(e) => setTaskDescription(e.detail.value)}
                maxlength={500}
              />
            </View>
          </CardContent>
        </Card>

        {/* 执行人 */}
        <Card>
          <CardContent className="p-3">
            <Text className="text-sm text-gray-700 mb-2">执行人</Text>
            <Picker
              mode="selector"
              range={executorList}
              rangeKey="nickname"
              value={executorIndex >= 0 ? executorIndex : 0}
              onChange={(e) => setExecutorIndex(parseInt(String(e.detail.value)))}
            >
              <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                <Text className={executorIndex >= 0 ? 'text-gray-800' : 'text-gray-400'}>
                  {executorIndex >= 0 && executorList[executorIndex]
                    ? executorList[executorIndex].nickname
                    : '选择执行人'}
                </Text>
                <Text className="text-gray-400">▼</Text>
              </View>
            </Picker>
          </CardContent>
        </Card>

        {/* 截止日期 */}
        <Card>
          <CardContent className="p-3">
            <View className="flex items-center mb-2">
              <Text className="text-red-500">*</Text>
              <Text className="text-sm text-gray-700 ml-1">截止日期</Text>
            </View>
            <Picker
              mode="date"
              value={requireDate || minDate}
              start={minDate}
              end={maxDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
              onChange={(e) => setRequireDate(e.detail.value)}
            >
              <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                <Text className={requireDate ? 'text-gray-800' : 'text-gray-400'}>
                  {requireDate || '请选择截止日期'}
                </Text>
                <Text className="text-gray-400">▼</Text>
              </View>
            </Picker>
            {maxDate && (
              <Text className="text-xs text-gray-400 mt-2">
                不能超过主任务截止日期（{maxDate}）
              </Text>
            )}
          </CardContent>
        </Card>

        {/* 优先级 */}
        <Card>
          <CardContent className="p-3">
            <Text className="text-sm text-gray-700 mb-2">优先级</Text>
            <View className="flex gap-2">
              {priorityOptions.map((opt) => (
                <View
                  key={opt.value}
                  className={`flex-1 p-2 rounded-lg border-2 text-center ${
                    priority === opt.value ? 'border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => setPriority(opt.value as any)}
                >
                  <Badge className={opt.color}>{opt.value}</Badge>
                  <Text className="text-xs text-gray-500 mt-1">{opt.label}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <Button
          className="w-full bg-blue-500 text-white py-3"
          onClick={createSubtask}
          disabled={submitting}
        >
          {submitting ? '创建中...' : '创建子任务'}
        </Button>
      </View>
    </View>
  );
}
