import { View, Text, Picker, Input as TaroInput, Textarea as TaroTextarea } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import { TaskPriority, CloudResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// 优先级配置
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; desc: string }[] = [
  { value: 'P0', label: 'P0', desc: '紧急重要' },
  { value: 'P1', label: 'P1', desc: '重要' },
  { value: 'P2', label: 'P2', desc: '普通' },
  { value: 'P3', label: 'P3', desc: '次要' }
];

// 优先级颜色
const PRIORITY_STYLE: Record<TaskPriority, string> = {
  P0: 'border-red-500 bg-red-50',
  P1: 'border-orange-500 bg-orange-50',
  P2: 'border-blue-500 bg-blue-50',
  P3: 'border-gray-300 bg-gray-50'
};

interface Executor {
  id: string;
  openid: string;
  name: string;
}

export default function Create() {
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P1');
  const [category, setCategory] = useState('');
  const [requireDate, setRequireDate] = useState('');
  const [executorList, setExecutorList] = useState<Executor[]>([]);
  const [executorIndex, setExecutorIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);

  // 加载执行人列表
  useEffect(() => {
    loadExecutors();
  }, []);

  const loadExecutors = async () => {
    try {
      // H5 端暂不支持数据库直接查询，使用模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        setExecutorList([
          { id: '1', openid: 'test1', name: '测试用户1' },
          { id: '2', openid: 'test2', name: '测试用户2' }
        ]);
        return;
      }
      
      // 小程序端查询数据库
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
      console.error('加载执行人失败:', err);
    }
  };

  // 提交任务
  const submitTask = async () => {
    // 验证
    if (!taskName.trim()) {
      Taro.showToast({ title: '请输入任务名称', icon: 'none' });
      return;
    }
    if (!requireDate) {
      Taro.showToast({ title: '请选择要求完成日期', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const executorId = executorIndex >= 0 ? executorList[executorIndex].openid : null;
      
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.TASK_CREATE,
        {
          task_name: taskName.trim(),
          task_description: taskDescription.trim(),
          priority,
          category: category.trim(),
          executor_id: executorId,
          require_date: requireDate
        }
      );

      if (res.success) {
        Taro.showToast({ title: '创建成功', icon: 'success' });
        // 清空表单
        setTaskName('');
        setTaskDescription('');
        setPriority('P1');
        setCategory('');
        setRequireDate('');
        setExecutorIndex(-1);
      } else {
        Taro.showToast({ title: res.message || '创建失败', icon: 'none' });
      }
    } catch (err) {
      console.error('创建任务失败:', err);
      Taro.showToast({ title: '创建失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 日期选择
  const onDateChange = (e) => {
    setRequireDate(e.detail.value);
  };

  // 执行人选择
  const onExecutorChange = (e) => {
    setExecutorIndex(parseInt(e.detail.value));
  };

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
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <TaroInput
                placeholder="请输入任务名称"
                placeholderClass="text-gray-400"
                value={taskName}
                onInput={(e) => setTaskName(e.detail.value)}
                maxlength={50}
                className="w-full text-sm"
              />
            </View>
          </CardContent>
        </Card>

        {/* 任务描述 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2">任务描述</Label>
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <TaroTextarea
                placeholder="请输入任务描述（可选）"
                placeholderClass="text-gray-400"
                value={taskDescription}
                onInput={(e) => setTaskDescription(e.detail.value)}
                maxlength={500}
                className="w-full text-sm"
                style={{ minHeight: '80px' }}
              />
            </View>
          </CardContent>
        </Card>

        {/* 优先级 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-3">优先级</Label>
            <View className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((item) => (
                <View
                  key={item.value}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                    priority === item.value
                      ? PRIORITY_STYLE[item.value]
                      : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => setPriority(item.value)}
                >
                  <Text className="text-base font-semibold">{item.label}</Text>
                  <Text className="text-xs text-gray-500">{item.desc}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* 分类 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2">分类</Label>
            <View className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <TaroInput
                placeholder="请输入分类（如：盛合智联、龙耀辉科技等）"
                placeholderClass="text-gray-400"
                value={category}
                onInput={(e) => setCategory(e.detail.value)}
                maxlength={20}
                className="w-full text-sm"
              />
            </View>
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
              onChange={onExecutorChange}
            >
              <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                <Text className={executorIndex >= 0 ? 'text-gray-800' : 'text-gray-400'}>
                  {executorIndex >= 0 ? executorList[executorIndex].name : '选择执行人（默认为自己）'}
                </Text>
                <Text className="text-gray-400">▼</Text>
              </View>
            </Picker>
          </CardContent>
        </Card>

        {/* 要求完成日期 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2 flex items-center">
              <Text className="text-red-500 mr-1">*</Text>
              <Text>要求完成日期</Text>
            </Label>
            <Picker mode="date" value={requireDate} onChange={onDateChange}>
              <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                <Text className={requireDate ? 'text-gray-800' : 'text-gray-400'}>
                  {requireDate || '选择日期'}
                </Text>
                <Text className="text-gray-400">📅</Text>
              </View>
            </Picker>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <Button
          className="w-full bg-blue-500 text-white rounded-lg py-3 text-base font-semibold"
          onClick={submitTask}
          disabled={submitting}
        >
          {submitting ? '创建中...' : '创建任务'}
        </Button>
      </View>
    </View>
  );
}
