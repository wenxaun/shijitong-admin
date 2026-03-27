import { View, Text, ScrollView, Picker } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleAlert, Calendar, Users, Send } from 'lucide-react-taro';

// 异常类型
type ExceptionType = 'delay' | 'assist';

interface TaskInfo {
  _id: string;
  task_name: string;
  require_date: string;
  executor_id: string;
  executor_name?: string;
  publisher_id: string;
}

interface TeamMember {
  openid: string;
  nickname: string;
}

export default function Exception() {
  const router = useRouter();
  const taskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [exceptionType, setExceptionType] = useState<ExceptionType>('delay');
  const [reason, setReason] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [assistUserId, setAssistUserId] = useState('');
  const [assistUserIndex, setAssistUserIndex] = useState(-1);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 计算最小和最大日期
  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  // 加载任务详情
  const loadTask = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const res = await callFunction<CloudResponse<{ task: TaskInfo; executor_name?: string }>>(
        'task-detail',
        { task_id: taskId }
      );

      if (res.success && res.data?.task) {
        setTask({
          ...res.data.task,
          executor_name: res.data.executor_name
        });
        // 默认新截止日期为原截止日期 + 7 天
        const originalDate = new Date(res.data.task.require_date);
        originalDate.setDate(originalDate.getDate() + 7);
        setNewDeadline(originalDate.toISOString().split('T')[0]);
      } else {
        Taro.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(() => Taro.navigateBack(), 1500);
      }
    } catch (err) {
      console.error('加载任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // 加载团队成员
  const loadTeamMembers = useCallback(async () => {
    try {
      const res = await callFunction<{ success: boolean; data?: { members: TeamMember[] } }>(
        'team-members',
        {}
      );

      if (res.success && res.data?.members) {
        setTeamMembers(res.data.members);
      }
    } catch (err) {
      console.error('加载团队成员失败:', err);
    }
  }, []);

  useEffect(() => {
    loadTask();
    loadTeamMembers();
  }, [loadTask, loadTeamMembers]);

  // 选择协助人
  const handleAssistUserChange = (e) => {
    const index = parseInt(String(e.detail.value));
    setAssistUserIndex(index);
    if (index >= 0 && teamMembers[index]) {
      setAssistUserId(teamMembers[index].openid);
    }
  };

  // 提交异常上报
  const submitException = async () => {
    if (!reason.trim()) {
      Taro.showToast({ title: '请填写异常原因', icon: 'none' });
      return;
    }

    if (exceptionType === 'delay' && !newDeadline) {
      Taro.showToast({ title: '请选择新的截止日期', icon: 'none' });
      return;
    }

    if (exceptionType === 'assist' && !assistUserId) {
      Taro.showToast({ title: '请选择协助人员', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await callFunction<CloudResponse>(
        'task-exception',
        {
          task_id: taskId,
          exception_type: exceptionType,
          reason: reason.trim(),
          new_deadline: exceptionType === 'delay' ? newDeadline : undefined,
          assist_user_id: exceptionType === 'assist' ? assistUserId : undefined,
          has_exception: true // 标记已上报异常
        }
      );

      if (res.success) {
        Taro.showToast({ title: '上报成功', icon: 'success' });
        
        // 发送通知给执行人（如果当前用户不是执行人）
        if (task && task.executor_id) {
          await callFunction('send-notification', {
            to_user_id: task.executor_id,
            type: 'exception_report',
            title: '任务异常上报',
            content: `任务「${task.task_name}」有异常上报：${exceptionType === 'delay' ? '申请延期' : '申请协助'}`,
            task_id: taskId
          });
        }

        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '上报失败', icon: 'none' });
      }
    } catch (err) {
      console.error('异常上报失败:', err);
      Taro.showToast({ title: '上报失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
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

  return (
    <View className="min-h-screen bg-gray-50">
      <ScrollView className="h-screen" scrollY>
        {/* 任务信息 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <View className="flex items-center mb-2">
              <CircleAlert size={20} color="#F97316" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">异常上报</Text>
            </View>
            <Text className="text-base text-gray-800 mb-2">{task.task_name}</Text>
            <View className="flex items-center gap-2">
              <Badge className="bg-blue-50 text-blue-600">
                截止：{task.require_date}
              </Badge>
              {task.executor_name && (
                <Badge className="bg-gray-100 text-gray-600">
                  执行人：{task.executor_name}
                </Badge>
              )}
            </View>
          </CardContent>
        </Card>

        {/* 异常类型选择 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <Text className="text-sm font-semibold text-gray-700 mb-3">异常类型</Text>
            <View className="flex gap-3">
              <View
                className={`flex-1 p-4 rounded-lg border-2 ${
                  exceptionType === 'delay'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => setExceptionType('delay')}
              >
                <View className="flex items-center mb-2">
                  <Calendar size={20} color={exceptionType === 'delay' ? '#1377EB' : '#9CA3AF'} />
                  <Text className={`ml-2 font-semibold ${exceptionType === 'delay' ? 'text-blue-600' : 'text-gray-600'}`}>
                    申请延期
                  </Text>
                </View>
                <Text className="text-xs text-gray-500">无法按时完成，需要延长截止日期</Text>
              </View>

              <View
                className={`flex-1 p-4 rounded-lg border-2 ${
                  exceptionType === 'assist'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => setExceptionType('assist')}
              >
                <View className="flex items-center mb-2">
                  <Users size={20} color={exceptionType === 'assist' ? '#1377EB' : '#9CA3AF'} />
                  <Text className={`ml-2 font-semibold ${exceptionType === 'assist' ? 'text-blue-600' : 'text-gray-600'}`}>
                    申请协助
                  </Text>
                </View>
                <Text className="text-xs text-gray-500">需要其他成员协助完成任务</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 延期配置 */}
        {exceptionType === 'delay' && (
          <Card className="mx-3 mt-3">
            <CardContent className="p-4">
              <Text className="text-sm font-semibold text-gray-700 mb-3">新的截止日期</Text>
              <Picker
                mode="date"
                value={newDeadline || minDate}
                start={minDate}
                end={maxDate}
                onChange={(e) => setNewDeadline(e.detail.value)}
              >
                <View className="bg-gray-50 rounded-lg px-3 py-3 flex items-center justify-between border border-gray-200">
                  <Text className={newDeadline ? 'text-gray-800' : 'text-gray-400'}>
                    {newDeadline || '选择新的截止日期'}
                  </Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
              </Picker>
              <Text className="text-xs text-gray-400 mt-2">
                原截止日期：{task.require_date}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* 协助人员选择 */}
        {exceptionType === 'assist' && (
          <Card className="mx-3 mt-3">
            <CardContent className="p-4">
              <Text className="text-sm font-semibold text-gray-700 mb-3">协助人员</Text>
              <Picker
                mode="selector"
                range={teamMembers}
                rangeKey="nickname"
                value={assistUserIndex >= 0 ? assistUserIndex : 0}
                onChange={handleAssistUserChange}
              >
                <View className="bg-gray-50 rounded-lg px-3 py-3 flex items-center justify-between border border-gray-200">
                  <Text className={assistUserIndex >= 0 && teamMembers[assistUserIndex] ? 'text-gray-800' : 'text-gray-400'}>
                    {assistUserIndex >= 0 && teamMembers[assistUserIndex]
                      ? teamMembers[assistUserIndex].nickname
                      : '选择协助人员'}
                  </Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
              </Picker>
            </CardContent>
          </Card>
        )}

        {/* 异常原因 */}
        <Card className="mx-3 mt-3">
          <CardContent className="p-4">
            <View className="flex items-center mb-3">
              <Text className="text-red-500">*</Text>
              <Text className="text-sm font-semibold text-gray-700 ml-1">异常原因</Text>
            </View>
            <View className="bg-gray-50 rounded-xl p-3">
              <Textarea
                style={{ width: '100%', minHeight: '100px', backgroundColor: 'transparent' }}
                placeholder="请详细说明异常情况、原因及解决方案..."
                value={reason}
                onInput={(e) => setReason(e.detail.value)}
                maxlength={500}
              />
            </View>
            <Text className="text-xs text-gray-400 mt-2 text-right">
              {reason.length}/500
            </Text>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <View className="mx-3 mt-4 mb-20">
          <Button
            className="w-full bg-blue-500 text-white py-3"
            onClick={submitException}
            disabled={submitting}
          >
            <Send size={16} color="#ffffff" />
            <Text className="text-white ml-2">{submitting ? '提交中...' : '提交异常上报'}</Text>
          </Button>
        </View>

        {/* 底部占位 */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
