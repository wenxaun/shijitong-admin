import { View, Text, Picker } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import type { FlowHistory, Collaborator, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Plus, ArrowRight } from 'lucide-react-taro';

interface Member {
  openid: string;
  nickname: string;
  avatar_url?: string;
}

export default function SubtaskEdit() {
  const router = useRouter();
  const { openid } = useUserStore();
  const subtaskId = router.params.id || '';

  const [loading, setLoading] = useState(true);
  const [parentTaskName, setParentTaskName] = useState('');
  const [parentTaskRequireDate, setParentTaskRequireDate] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [executorList, setExecutorList] = useState<Member[]>([]);
  const [executorIndex, setExecutorIndex] = useState(-1);
  const [requireDate, setRequireDate] = useState('');
  const [minDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxDate, setMaxDate] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [flowHistory, setFlowHistory] = useState<FlowHistory[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 加载子任务信息
  const loadSubtask = useCallback(async () => {
    if (!subtaskId || !openid) return;

    setLoading(true);
    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        // H5 模拟数据
        setTaskName('示例子任务');
        setTaskDescription('示例描述');
        setRequireDate(new Date().toISOString().split('T')[0]);
        setMaxDate('2025-12-31');
        setParentTaskName('示例主任务');
        setParentTaskRequireDate('2025-12-31');
        setExecutorList([
          { openid: 'test1', nickname: '张三' },
          { openid: 'test2', nickname: '李四' }
        ]);
        setExecutorIndex(0);
        setCollaborators([]);
        setFlowHistory([]);
        setCanDelete(true);
        setLoading(false);
        return;
      }

      // @ts-ignore
      const db = wx.cloud.database();
      const res = await db.collection('tasks').doc(subtaskId).get();

      if (res.data) {
        const task = res.data;
        setTaskName(task.task_name);
        setTaskDescription(task.task_description || '');
        setRequireDate(formatDate(task.require_date));
        setCollaborators(task.collaborators || []);
        setFlowHistory(formatFlowHistory(task.flow_history || []));

        // 判断是否能删除
        const currentOpenid = openid;
        setCanDelete(task.publisher_id === currentOpenid || task.executor_id === currentOpenid);

        // 加载主任务信息
        if (task.parent_task_id) {
          loadParentTask(task.parent_task_id);
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

  // 加载主任务信息
  const loadParentTask = async (parentTaskId: string) => {
    try {
      // @ts-ignore
      const db = wx.cloud.database();
      const res = await db.collection('tasks').doc(parentTaskId).get();

      if (res.data) {
        setParentTaskName(res.data.task_name);
        setParentTaskRequireDate(formatDate(res.data.require_date));
        setMaxDate(formatDate(res.data.require_date));
      }
    } catch (err) {
      console.error('加载主任务失败:', err);
    }
  };

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
            .field({ openid: true, nickname: true, avatar_url: true })
            .get();

          setExecutorList(membersRes.data);
          // 设置当前执行人索引
          const idx = membersRes.data.findIndex((m: Member) => m.openid === userRes.data[0].openid);
          setExecutorIndex(idx >= 0 ? idx : -1);
        } else {
          setExecutorList([{ openid, nickname: '我' }]);
          setExecutorIndex(0);
        }
      }
    } catch (err) {
      console.error('加载团队成员失败:', err);
    }
  };

  // 格式化日期
  const formatDate = (date: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // 格式化流转历史
  const formatFlowHistory = (history: any[]): FlowHistory[] => {
    return history.map(flow => ({
      ...flow,
      flow_date: formatDateTime(flow.flow_date)
    }));
  };

  // 格式化日期时间
  const formatDateTime = (date: string | number): string => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    loadSubtask();
  }, [loadSubtask]);

  // 添加协助人
  const addCollaborator = () => {
    // 排除已选择的协助人
    const availableMembers = executorList.filter(member => {
      return !collaborators.some(c => c.openid === member.openid);
    });

    if (availableMembers.length === 0) {
      Taro.showToast({ title: '没有可添加的成员', icon: 'none' });
      return;
    }

    Taro.showActionSheet({
      itemList: availableMembers.map(u => u.nickname),
      success: (res) => {
        const user = availableMembers[res.tapIndex];
        if (collaborators.length > 0) {
          // 替换
          Taro.showModal({
            title: '确认',
            content: `确定将协助人修改为 ${user.nickname} 吗？`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                setCollaborators([{ openid: user.openid, name: user.nickname }]);
              }
            }
          });
        } else {
          setCollaborators([...collaborators, { openid: user.openid, name: user.nickname }]);
        }
      }
    });
  };

  // 移除协助人
  const removeCollaborator = (index: number) => {
    Taro.showModal({
      title: '确认',
      content: '确定移除该协助人吗？',
      success: (res) => {
        if (res.confirm) {
          setCollaborators(collaborators.filter((_, i) => i !== index));
        }
      }
    });
  };

  // 保存修改
  const saveSubtask = async () => {
    if (!taskName.trim()) {
      Taro.showToast({ title: '请输入任务名称', icon: 'none' });
      return;
    }

    if (executorIndex < 0) {
      Taro.showToast({ title: '请选择执行人', icon: 'none' });
      return;
    }

    if (!requireDate) {
      Taro.showToast({ title: '请选择截止日期', icon: 'none' });
      return;
    }

    const executor = executorList[executorIndex];

    setSubmitting(true);
    try {
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.SUBTASK_UPDATE,
        {
          subtask_id: subtaskId,
          task_name: taskName,
          task_description: taskDescription,
          executor_id: executor.openid,
          require_date: requireDate,
          collaborators: collaborators
        }
      );

      if (res.success) {
        Taro.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('保存子任务失败:', err);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除子任务
  const deleteSubtask = () => {
    Taro.showModal({
      title: '确认删除',
      content: '确定删除此子任务吗？删除后无法恢复。',
      confirmColor: '#FF5252',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await callFunction<CloudResponse>(
              CLOUD_FUNCTIONS.SUBTASK_DELETE,
              { subtask_id: subtaskId }
            );

            if (result.success) {
              Taro.showToast({ title: '删除成功', icon: 'success' });
              setTimeout(() => Taro.navigateBack(), 1500);
            } else {
              Taro.showToast({ title: result.message || '删除失败', icon: 'none' });
            }
          } catch (err) {
            console.error('删除失败:', err);
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
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
        {/* 主任务信息 */}
        {parentTaskName && (
          <Card>
            <CardContent className="p-4">
              <View className="flex items-center">
                <Text className="text-2xl mr-3">📋</Text>
                <View>
                  <Text className="text-xs text-gray-400">主任务</Text>
                  <Text className="text-sm font-semibold text-gray-800">{parentTaskName}</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 编辑表单 */}
        <Card>
          <CardContent className="p-4">
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <Text className="text-red-500">*</Text>
                <Text className="text-sm text-gray-700 ml-1">子任务名称</Text>
              </View>
              <Input
                placeholder="请输入子任务名称"
                value={taskName}
                onInput={(e) => setTaskName(e.detail.value)}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm text-gray-700 mb-2">任务描述</Text>
              <View className="bg-gray-50 rounded-xl p-3">
                <Textarea
                  className="bg-gray-50"
                  placeholder="请输入任务描述（选填）"
                  value={taskDescription}
                  onInput={(e) => setTaskDescription(e.detail.value)}
                  maxlength={500}
                />
              </View>
            </View>

            <View className="mb-4">
              <View className="flex items-center mb-2">
                <Text className="text-red-500">*</Text>
                <Text className="text-sm text-gray-700 ml-1">执行人</Text>
              </View>
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
                      : '请选择执行人'}
                  </Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
              </Picker>
            </View>

            <View>
              <View className="flex items-center mb-2">
                <Text className="text-red-500">*</Text>
                <Text className="text-sm text-gray-700 ml-1">截止日期</Text>
              </View>
              <Picker
                mode="date"
                value={requireDate}
                start={minDate}
                end={maxDate || undefined}
                onChange={(e) => setRequireDate(e.detail.value)}
              >
                <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                  <Text className={requireDate ? 'text-gray-800' : 'text-gray-400'}>
                    {requireDate || '请选择截止日期'}
                  </Text>
                  <Text className="text-gray-400">▼</Text>
                </View>
              </Picker>
              {parentTaskRequireDate && (
                <Text className="text-xs text-gray-400 mt-2">
                  不能超过主任务截止日期（{parentTaskRequireDate}）
                </Text>
              )}
            </View>
          </CardContent>
        </Card>

        {/* 协助人管理 */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-sm text-gray-700 mb-3">协助人</Text>

            {/* 已添加的协助人 */}
            {collaborators.length > 0 && (
              <View className="flex flex-wrap gap-2 mb-3">
                {collaborators.map((c, index) => (
                  <View key={c.openid} className="flex items-center bg-blue-50 rounded-full px-3 py-1">
                    <Text className="text-sm text-blue-600">{c.name}</Text>
                    <View className="ml-2" onClick={() => removeCollaborator(index)}>
                      <Text className="text-blue-400">×</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 添加协助人按钮 */}
            <View
              className="flex items-center p-3 border-2 border-dashed border-gray-200 rounded-lg"
              onClick={addCollaborator}
            >
              <Plus size={18} color="#1377EB" />
              <Text className="text-blue-500 ml-2">
                {collaborators.length > 0 ? '修改协助人' : '添加协助人'}
              </Text>
            </View>

            {collaborators.length === 0 && (
              <Text className="text-xs text-gray-400 mt-2">添加协助人可以让他们收到任务通知</Text>
            )}
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
                    <View className="flex-1">
                      <View className="flex items-center">
                        <Text className="text-sm text-gray-800">{flow.from_executor_name || '执行人'}</Text>
                        <ArrowRight size={16} color="#9CA3AF" className="mx-2" />
                        <Text className="text-sm text-blue-500">{flow.to_executor_name || '执行人'}</Text>
                      </View>
                      <Text className="text-xs text-gray-400 mt-1">{String(flow.flow_date)}</Text>
                      {flow.reason && (
                        <Text className="text-xs text-gray-500 mt-1">原因：{flow.reason}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <Button
          className="w-full bg-blue-500 text-white py-3"
          onClick={saveSubtask}
          disabled={submitting}
        >
          {submitting ? '保存中...' : '保存修改'}
        </Button>

        {canDelete && (
          <Button
            variant="outline"
            className="w-full text-red-500 border-red-300 py-3"
            onClick={deleteSubtask}
          >
            <Trash2 size={18} color="#EF4444" />
            <Text className="text-red-500 ml-2">删除子任务</Text>
          </Button>
        )}
      </View>
    </View>
  );
}
