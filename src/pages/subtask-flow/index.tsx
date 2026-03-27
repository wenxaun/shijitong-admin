import { View, Text, Picker } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { FlowHistory, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react-taro';

interface Member {
  openid: string;
  nickname: string;
}

export default function SubtaskFlow() {
  const router = useRouter();
  const { openid } = useUserStore();
  const subtaskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [taskName, setTaskName] = useState('');
  const [currentExecutorName, setCurrentExecutorName] = useState('');
  const [memberList, setMemberList] = useState<Member[]>([]);
  const [toExecutorIndex, setToExecutorIndex] = useState(-1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [flowHistory, setFlowHistory] = useState<FlowHistory[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 加载子任务信息
  const loadSubtask = useCallback(async () => {
    if (!subtaskId || !openid) return;

    setLoading(true);
    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setTaskName('示例子任务');
        setCurrentExecutorName('张三');
        setMemberList([
          { openid: 'test2', nickname: '李四' },
          { openid: 'test3', nickname: '王五' }
        ]);
        setFlowHistory([]);
        setLoading(false);
        return;
      }

      // @ts-ignore
      const db = wx.cloud.database();
      const res = await db.collection('tasks').doc(subtaskId).get();

      if (res.data) {
        const task = res.data;
        setTaskName(task.task_name);
        setFlowHistory(task.flow_history || []);

        // 获取当前执行人名称
        if (task.current_executor || task.executor_id) {
          const userRes = await db.collection('users')
            .where({ openid: task.current_executor || task.executor_id })
            .field({ nickname: true })
            .get();

          if (userRes.data.length > 0) {
            setCurrentExecutorName(userRes.data[0].nickname);
          }
        }

        // 加载团队成员
        loadTeamMembers();
      }
    } catch (err) {
      console.error('加载子任务失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [subtaskId, openid]);

  // 加载团队成员
  const loadTeamMembers = async () => {
    if (!openid) return;

    try {
      // @ts-ignore
      const db = wx.cloud.database();
      const userRes = await db.collection('users').where({ openid }).get();

      if (userRes.data.length > 0) {
        const user = userRes.data[0];
        if (user.organization_id) {
          const membersRes = await db.collection('users')
            .where({ organization_id: user.organization_id })
            .field({ openid: true, nickname: true })
            .get();

          // 排除当前用户
          setMemberList(membersRes.data.filter(m => m.openid !== openid));
        }
      }
    } catch (err) {
      console.error('加载团队成员失败:', err);
    }
  };

  useEffect(() => {
    loadSubtask();
  }, [loadSubtask]);

  // 提交流转
  const submitFlow = async () => {
    if (toExecutorIndex < 0) {
      Taro.showToast({ title: '请选择接收人', icon: 'none' });
      return;
    }

    const toExecutor = memberList[toExecutorIndex];

    setSubmitting(true);
    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.SUBTASK_UPDATE,
        {
          subtask_id: subtaskId,
          flow_request: {
            to_executor: toExecutor.openid,
            reason: reason,
            note: note
          }
        }
      );

      if (res.success) {
        Taro.showToast({ title: '流转成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '流转失败', icon: 'none' });
      }
    } catch (err) {
      console.error('流转失败:', err);
      Taro.showToast({ title: '流转失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-3">
        <Card>
          <CardContent className="p-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </View>
    );
  }

  return (
    <View className="min-h-screen bg-gray-50">
      <View className="p-3 space-y-3">
        {/* 当前任务信息 */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-xs text-gray-400">当前任务</Text>
            <Text className="text-base font-semibold text-gray-800 mt-1">{taskName}</Text>
            <Text className="text-xs text-gray-400 mt-4">当前执行人</Text>
            <Text className="text-base text-gray-800 mt-1">{currentExecutorName}</Text>
          </CardContent>
        </Card>

        {/* 流转表单 */}
        <Card>
          <CardContent className="p-4">
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <Text className="text-red-500">*</Text>
                <Text className="text-sm text-gray-700 ml-1">流转给</Text>
              </View>
              <Picker
                mode="selector"
                range={memberList}
                rangeKey="nickname"
                value={toExecutorIndex >= 0 ? toExecutorIndex : 0}
                onChange={(e) => setToExecutorIndex(parseInt(String(e.detail.value)))}
              >
                <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                  <Text className={toExecutorIndex >= 0 ? 'text-gray-800' : 'text-gray-400'}>
                    {toExecutorIndex >= 0 && memberList[toExecutorIndex]
                      ? memberList[toExecutorIndex].nickname
                      : '请选择接收人'}
                  </Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
              </Picker>
            </View>

            <View className="mb-4">
              <Text className="text-sm text-gray-700 mb-2">流转原因</Text>
              <View className="bg-gray-50 rounded-xl p-3">
                <Textarea
                  className="bg-gray-50"
                  placeholder="请输入流转原因（选填）"
                  value={reason}
                  onInput={(e) => setReason(e.detail.value)}
                  maxlength={200}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm text-gray-700 mb-2">备注</Text>
              <View className="bg-gray-50 rounded-xl p-3">
                <Textarea
                  className="bg-gray-50"
                  placeholder="请输入备注（选填）"
                  value={note}
                  onInput={(e) => setNote(e.detail.value)}
                  maxlength={200}
                />
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 流转历史 */}
        {flowHistory.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <View className="flex items-center justify-between mb-3">
                <Text className="text-base font-semibold text-gray-800">流转记录</Text>
                <Text className="text-sm text-gray-400">{flowHistory.length} 条</Text>
              </View>
              <View className="space-y-3">
                {flowHistory.map((flow, index) => (
                  <View key={index} className="flex items-start">
                    <View className="flex items-center">
                      <Text className="text-sm text-gray-800">{flow.from_executor_name || '执行人'}</Text>
                      <ArrowRight size={16} color="#9CA3AF" className="mx-2" />
                      <Text className="text-sm text-blue-500">{flow.to_executor_name || '执行人'}</Text>
                    </View>
                    {flow.reason && (
                      <Text className="text-xs text-gray-400 mt-1">原因：{flow.reason}</Text>
                    )}
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* 提交按钮 */}
        <Button
          className="w-full bg-blue-500 text-white py-3"
          onClick={submitFlow}
          disabled={submitting}
        >
          {submitting ? '流转中...' : '确认流转'}
        </Button>
      </View>
    </View>
  );
}
