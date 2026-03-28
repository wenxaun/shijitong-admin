// 注意：分享功能必须使用 Taro 原生 Button 组件，因为需要 openType="share"
// eslint-disable-next-line no-restricted-syntax
import { View, Text, Picker, Button } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Users } from 'lucide-react-taro';

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
  
  // 执行人来源类型：team-团队成员，friend-微信好友
  const [executorSource, setExecutorSource] = useState<'team' | 'friend'>('team');
  const [friendName, setFriendName] = useState('');

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

    // 根据执行人来源验证
    if (executorSource === 'team') {
      if (executorIndex < 0 || executorList.length === 0) {
        Taro.showToast({ title: '请选择执行人', icon: 'none' });
        return;
      }
    } else {
      if (!friendName.trim()) {
        Taro.showToast({ title: '请输入好友昵称', icon: 'none' });
        return;
      }
    }

    // 获取执行人信息
    const executorId = executorSource === 'team' && executorIndex >= 0 
      ? executorList[executorIndex].openid 
      : `friend_${Date.now()}`; // 微信好友使用临时ID
    const executorName = executorSource === 'team' && executorIndex >= 0
      ? executorList[executorIndex].nickname
      : friendName;

    setSubmitting(true);
    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.SUBTASK_CREATE,
        {
          task_id: parentTaskId,
          title: taskName,
          description: taskDescription,
          executor_id: executorId,
          executor_name: executorName,
          require_date: requireDate,
          priority: priority,
          executor_source: executorSource // 标记执行人来源
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

  // 分享配置
  Taro.useShareAppMessage(() => {
    return {
      title: `请协助完成子任务：${taskName}`,
      path: `/pages/subtask-detail/index?id=${parentTaskId}`,
      imageUrl: ''
    };
  });



  const priorityOptions = [
    { value: 'P0', label: '紧急', color: 'bg-red-50 text-red-500' },
    { value: 'P1', label: '高', color: 'bg-orange-50 text-orange-500' },
    { value: 'P2', label: '中', color: 'bg-blue-50 text-blue-500' },
    { value: 'P3', label: '低', color: 'bg-gray-50 text-gray-400' }
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
              placeholderClass="text-gray-400"
              value={taskName}
              onInput={(e) => setTaskName(e.detail.value)}
              maxlength={50}
              className="bg-gray-50 border-gray-200"
            />
          </CardContent>
        </Card>

        {/* 任务描述 */}
        <Card>
          <CardContent className="p-3">
            <Text className="text-sm text-gray-700 mb-2">任务描述</Text>
            <Textarea
              placeholder="请输入任务描述（可选）"
              placeholderClass="text-gray-400"
              value={taskDescription}
              onInput={(e) => setTaskDescription(e.detail.value)}
              maxlength={500}
              className="bg-gray-50 border-gray-200"
            />
          </CardContent>
        </Card>

        {/* 执行人 */}
        <Card>
          <CardContent className="p-3">
            <Text className="text-sm text-gray-700 mb-2">执行人</Text>
            
            {/* 执行人来源选择 */}
            <View className="flex gap-2 mb-3">
              <View 
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg ${
                  executorSource === 'team' ? 'bg-blue-500' : 'bg-gray-100'
                }`}
                onClick={() => setExecutorSource('team')}
              >
                <Users size={16} color={executorSource === 'team' ? '#ffffff' : '#6B7280'} />
                <Text className={executorSource === 'team' ? 'text-white text-sm' : 'text-gray-600 text-sm'}>
                  团队成员
                </Text>
              </View>
              <View 
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg ${
                  executorSource === 'friend' ? 'bg-blue-500' : 'bg-gray-100'
                }`}
                onClick={() => setExecutorSource('friend')}
              >
                <Share2 size={16} color={executorSource === 'friend' ? '#ffffff' : '#6B7280'} />
                <Text className={executorSource === 'friend' ? 'text-white text-sm' : 'text-gray-600 text-sm'}>
                  微信好友
                </Text>
              </View>
            </View>
            
            {/* 团队成员选择 */}
            {executorSource === 'team' && (
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
            )}
            
            {/* 微信好友输入 */}
            {executorSource === 'friend' && (
              <View className="space-y-2">
                <Input
                  placeholder="请输入好友昵称"
                  placeholderClass="text-gray-400"
                  value={friendName}
                  onInput={(e) => setFriendName(e.detail.value)}
                  className="bg-gray-50 border-gray-200"
                />
                <Button
                  className="w-full bg-green-500 text-white py-2 border-0"
                  size="mini"
                  openType="share"
                >
                  <Share2 size={16} color="#ffffff" />
                  <Text className="text-white text-sm ml-1">转发给好友</Text>
                </Button>
                <Text className="text-xs text-gray-400">
                  转发给微信好友后，好友可通过小程序查看并协助完成子任务
                </Text>
              </View>
            )}
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
          <CardContent className="p-4">
            <Text className="text-sm text-gray-700 mb-3">优先级</Text>
            <View className="flex gap-3">
              {priorityOptions.map((opt) => {
                const isSelected = priority === opt.value;
                return (
                  <View
                    key={opt.value}
                    className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? opt.value === 'P0'
                          ? 'bg-red-500'
                          : opt.value === 'P1'
                          ? 'bg-orange-500'
                          : opt.value === 'P2'
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                        : 'bg-gray-50'
                    }`}
                    onClick={() => setPriority(opt.value as any)}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-white' : opt.color.split(' ')[1]
                      }`}
                    >
                      {opt.value}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${
                        isSelected ? 'text-white opacity-80' : 'text-gray-400'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </View>
                );
              })}
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
