import { View, Text, ScrollView, Picker } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { callFunction } from '@/utils/cloud';
import { TaskPriority, CloudResponse, TaskGroup } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Share2, Sparkles, Loader, CircleCheck, Clock, Tag, MessageSquare } from 'lucide-react-taro';

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

interface ParsedTask {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  executor: string;
  confidence: number;
}

interface Executor {
  id: string;
  openid: string;
  name: string;
}

export default function ShareCreate() {
  const router = useRouter();
  
  // 分享内容
  const [shareContent, setShareContent] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState<'group' | 'private' | undefined>();
  
  // 解析结果
  const [parsing, setParsing] = useState(false);
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  
  // 表单字段
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P1');
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [requireDate, setRequireDate] = useState('');
  const [executorList, setExecutorList] = useState<Executor[]>([]);
  const [executorIndex, setExecutorIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);

  // 初始化
  useEffect(() => {
    loadExecutors();
    loadGroups();
    parseShareParams();
  }, []);

  // 解析分享参数
  const parseShareParams = async () => {
    const params = router.params;
    console.log('[share-create] 分享参数:', params);
    
    // 从分享参数中获取内容
    let content = '';
    let sName = '';
    let sChatType: 'group' | 'private' | undefined;
    
    // 尝试获取分享内容
    if (params.title) {
      content = params.title;
    }
    if (params.desc) {
      content += (content ? '\n' : '') + params.desc;
    }
    if (params.path) {
      content += (content ? '\n' : '') + params.path;
    }
    
    // 获取来源信息（如果有的话）
    if (params.sourceName) {
      sName = decodeURIComponent(params.sourceName);
    }
    if (params.sourceType) {
      sChatType = params.sourceType as 'group' | 'private';
    }
    
    // 如果没有获取到内容，显示提示
    if (!content) {
      // H5 模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        content = '下周五之前完成项目报告，需要包含竞品分析部分';
        sName = '产品需求讨论群';
        sChatType = 'group';
      }
    }
    
    setShareContent(content);
    setSourceName(sName);
    setSourceType(sChatType);
    
    // 如果有内容，自动解析
    if (content) {
      await parseWithAI(content);
    }
  };

  // AI 解析
  const parseWithAI = async (content: string) => {
    if (!content.trim()) return;
    
    setParsing(true);
    try {
      // H5 端模拟解析
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockResult: ParsedTask = {
          title: '完成项目报告',
          description: '需要包含竞品分析部分',
          dueDate: getNextFriday(),
          priority: 'P1',
          executor: '',
          confidence: 85
        };
        
        setParsedTask(mockResult);
        setTaskName(mockResult.title);
        setTaskDescription(mockResult.description);
        setPriority(mockResult.priority);
        setRequireDate(mockResult.dueDate);
        return;
      }
      
      // 小程序端调用云函数
      const res = await callFunction<CloudResponse<{ parsed: ParsedTask }>>(
        'task-parse-share',
        { content }
      );
      
      if (res.success && res.data?.parsed) {
        const parsed = res.data.parsed;
        setParsedTask(parsed);
        setTaskName(parsed.title);
        setTaskDescription(parsed.description);
        setPriority(parsed.priority);
        setRequireDate(parsed.dueDate);
      }
    } catch (err) {
      console.error('AI 解析失败:', err);
      Taro.showToast({ title: '解析失败，请手动填写', icon: 'none' });
    } finally {
      setParsing(false);
    }
  };

  // 获取下周五日期
  const getNextFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday.toISOString().split('T')[0];
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
      console.error('加载执行人失败:', err);
    }
  };

  const loadGroups = async () => {
    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const storedGroups = Taro.getStorageSync('mock_groups') || '[]';
        let groupList = JSON.parse(storedGroups);
        
        if (groupList.length === 0) {
          groupList = [
            { _id: 'default1', name: '工作', user_id: 'test', order: 1, created_at: new Date().toISOString() },
            { _id: 'default2', name: '个人', user_id: 'test', order: 2, created_at: new Date().toISOString() }
          ];
          Taro.setStorageSync('mock_groups', JSON.stringify(groupList));
        }
        
        setGroups(groupList.sort((a: TaskGroup, b: TaskGroup) => a.order - b.order));
        return;
      }
      
      const res = await callFunction<CloudResponse<{ groups: TaskGroup[] }>>('group-list', {});
      if (res.success && res.data) {
        setGroups(res.data.groups || []);
      }
    } catch (err) {
      console.error('加载分组失败:', err);
    }
  };

  // 提交任务
  const submitTask = async () => {
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
      const executor = executorIndex >= 0 ? executorList[executorIndex] : null;
      const executorId = executor?.openid || null;
      const executorName = executor?.name || '';
      
      console.log('[share-create] 创建任务参数:', {
        task_name: taskName.trim(),
        priority,
        group_id: groupId || undefined,
        group_name: groupName || undefined,
        executor_id: executorId,
        executor_name: executorName,
        require_date: requireDate,
        source: {
          type: 'chat_share',
          source_name: sourceName,
          source_type: sourceType,
          original_content: shareContent,
          shared_at: new Date().toISOString()
        }
      });
      
      const res = await callFunction<CloudResponse>(
        'task-create',
        {
          task_name: taskName.trim(),
          task_description: taskDescription.trim(),
          priority,
          category: groupName || undefined,
          group_id: groupId || undefined,
          group_name: groupName || undefined,
          executor_id: executorId,
          executor_name: executorName,
          require_date: requireDate,
          source: {
            type: 'chat_share',
            source_name: sourceName,
            source_type: sourceType,
            original_content: shareContent,
            shared_at: new Date().toISOString()
          }
        }
      );

      if (res.success) {
        Taro.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => {
          console.log('[ShareCreate] 跳转到首页');
          Taro.reLaunch({ url: '/pages/index/index' });
        }, 1000);
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

  // 分组选择
  const getGroupPickerRange = () => {
    const groupNames = groups.map(g => g.name);
    return [...groupNames, '不分组'];
  };

  const onGroupChange = (e) => {
    const index = parseInt(e.detail.value);
    if (index === groups.length) {
      setGroupId('');
      setGroupName('');
    } else {
      setGroupId(groups[index]._id);
      setGroupName(groups[index].name);
    }
  };

  return (
    <View className="min-h-screen bg-gray-50 pb-20">
      <ScrollView className="h-screen" scrollY>
        {/* 分享来源信息 */}
        {sourceName && (
          <View className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
            <View className="flex items-center gap-2">
              <Share2 size={16} color="#fff" />
              <Text className="text-white text-sm">
                来自{sourceType === 'group' ? '群聊' : '私聊'}：{sourceName}
              </Text>
            </View>
          </View>
        )}

        {/* 原始内容预览 */}
        {shareContent && (
          <View className="px-4 pt-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <View className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} color="#1377EB" />
                  <Text className="text-sm text-blue-600 font-medium">原始消息</Text>
                </View>
                <Text className="text-gray-700 text-sm leading-relaxed">{shareContent}</Text>
              </CardContent>
            </Card>
          </View>
        )}

        {/* AI 解析状态 */}
        {parsing && (
          <View className="px-4 pt-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Loader size={20} color="#1377EB" className="animate-spin" />
                <View>
                  <Text className="text-gray-800 font-medium">AI 正在解析消息...</Text>
                  <Text className="text-gray-500 text-xs">正在提取任务信息</Text>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* AI 解析结果 */}
        {parsedTask && !parsing && (
          <View className="px-4 pt-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <View className="flex items-center gap-2 mb-3">
                  <Sparkles size={18} color="#22C55E" />
                  <Text className="text-green-700 font-medium">AI 解析结果</Text>
                  <Badge className="ml-auto bg-green-100 text-green-700">
                    <Text className="text-xs">置信度 {parsedTask.confidence}%</Text>
                  </Badge>
                </View>
                
                <View className="space-y-2">
                  <View className="flex items-center gap-2">
                    <CircleCheck size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs">标题：</Text>
                    <Text className="text-gray-800 text-sm">{parsedTask.title}</Text>
                  </View>
                  <View className="flex items-center gap-2">
                    <Clock size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs">截止：</Text>
                    <Text className="text-gray-800 text-sm">{parsedTask.dueDate}</Text>
                  </View>
                  <View className="flex items-center gap-2">
                    <Tag size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs">优先级：</Text>
                    <Text className="text-gray-800 text-sm">{parsedTask.priority}</Text>
                  </View>
                </View>
                
                <View className="mt-3 pt-3 border-t border-green-200">
                  <Text className="text-gray-500 text-xs">以下信息已自动填入表单，您可以修改后提交</Text>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* 任务表单 */}
        <View className="p-4 space-y-3">
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
                className="bg-gray-50 border-gray-200"
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
                className="bg-gray-50 border-gray-200"
              />
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

          {/* 任务分组 */}
          <Card>
            <CardContent className="p-3">
              <Label className="text-sm text-gray-500 mb-2">任务分组</Label>
              <Picker
                mode="selector"
                range={getGroupPickerRange()}
                value={groupId ? groups.findIndex(g => g._id === groupId) : groups.length}
                onChange={onGroupChange}
              >
                <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                  <Text className={groupName ? 'text-gray-800' : 'text-gray-400'}>
                    {groupName || '不分组'}
                  </Text>
                  <Text className="text-gray-400">▼</Text>
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
            disabled={submitting || parsing}
          >
            {submitting ? '创建中...' : '创建任务'}
          </Button>
        </View>

        {/* 底部占位 */}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
