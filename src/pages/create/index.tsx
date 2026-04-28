import { View, Text, Picker } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { callFunction, CLOUD_FUNCTIONS } from '@/utils/cloud';
import { TaskPriority, CloudResponse, TaskGroup } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContactSelect } from '@/components/contact-select';
import { DepartmentSelect } from '@/components/department-select';
import { isWework } from '@/utils/env';
import { Building2, Users } from 'lucide-react-taro';

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

// 重复类型
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

const REPEAT_OPTIONS: { value: RepeatType; label: string; desc: string }[] = [
  { value: 'none', label: '不重复', desc: '单次任务' },
  { value: 'daily', label: '每天', desc: '每日重复' },
  { value: 'weekly', label: '每周', desc: '每周重复' },
  { value: 'monthly', label: '每月', desc: '每月重复' }
];

interface Executor {
  id: string;
  openid: string;
  name: string;
}

export default function Create() {
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
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatEndDate, setRepeatEndDate] = useState('');

  // 企业微信相关状态
  const [isWeworkEnv, setIsWeworkEnv] = useState(false);
  const [showContactSelect, setShowContactSelect] = useState(false);
  const [showDepartmentSelect, setShowDepartmentSelect] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<{ id: number; name: string } | null>(null);

  // 加载数据
  useEffect(() => {
    loadExecutors();
    loadGroups();
    detectEnvironment();
  }, []);

  // 检测环境
  const detectEnvironment = async () => {
    const env = await isWework();
    setIsWeworkEnv(env);
  };

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

  // 加载待办分组
  const loadGroups = async () => {
    try {
      // H5 端使用本地存储
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const storedGroups = Taro.getStorageSync('mock_groups') || '[]';
        let groupList = JSON.parse(storedGroups);
        
        if (groupList.length === 0) {
          // 默认分组
          groupList = [
            { _id: 'default1', name: '工作', user_id: 'test', order: 1, created_at: new Date().toISOString() },
            { _id: 'default2', name: '个人', user_id: 'test', order: 2, created_at: new Date().toISOString() }
          ];
          Taro.setStorageSync('mock_groups', JSON.stringify(groupList));
        }
        
        setGroups(groupList.sort((a: TaskGroup, b: TaskGroup) => a.order - b.order));
        return;
      }
      
      // 小程序端
      const res = await callFunction<CloudResponse<{ groups: TaskGroup[] }>>('group-list', {});
      if (res.success && res.data) {
        setGroups(res.data.groups || []);
      }
    } catch (err) {
      console.error('加载分组失败:', err);
    }
  };

  // 新增分组
  const addNewGroup = async () => {
    if (!newGroupName.trim()) {
      Taro.showToast({ title: '请输入分组名称', icon: 'none' });
      return;
    }
    
    setAddingGroup(true);
    try {
      // H5 端
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const newGroup: TaskGroup = {
          _id: `group_${Date.now()}`,
          name: newGroupName.trim(),
          user_type: 'personal' as const,
          user_id: 'test',
          order: groups.length + 1,
          created_at: new Date().toISOString()
        };
        const updatedGroups = [...groups, newGroup];
        Taro.setStorageSync('mock_groups', JSON.stringify(updatedGroups));
        setGroups(updatedGroups);
        setGroupId(newGroup._id);
        setGroupName(newGroup.name);
        setShowAddGroupDialog(false);
        setNewGroupName('');
        Taro.showToast({ title: '添加成功', icon: 'success' });
        return;
      }
      
      // 小程序端
      const res = await callFunction<CloudResponse<{ group: TaskGroup }>>('group-create', {
        name: newGroupName.trim()
      });
      
      if (res.success && res.data) {
        setGroups([...groups, res.data.group]);
        setGroupId(res.data.group._id);
        setGroupName(res.data.group.name);
        setShowAddGroupDialog(false);
        setNewGroupName('');
        Taro.showToast({ title: '添加成功', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '添加失败', icon: 'none' });
      }
    } catch (err) {
      console.error('添加分组失败:', err);
      Taro.showToast({ title: '添加失败', icon: 'none' });
    } finally {
      setAddingGroup(false);
    }
  };

  // 提交任务
  const submitTask = async () => {
    // 验证
    if (!taskName.trim()) {
      Taro.showToast({ title: '请输入待办名称', icon: 'none' });
      return;
    }
    if (!requireDate) {
      Taro.showToast({ title: '请选择截止日期', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const executor = executorIndex >= 0 ? executorList[executorIndex] : null;
      const executorId = executor?.openid || null;
      const executorName = executor?.name || '';
      
      console.log('[create] 创建待办参数:', {
        task_name: taskName.trim(),
        priority,
        group_id: groupId || undefined,
        group_name: groupName || undefined,
        executor_id: executorId,
        executor_name: executorName,
        require_date: requireDate,
        repeat_type: repeatType,
        repeat_end_date: repeatEndDate || undefined
      });
      
      const res = await callFunction<CloudResponse>(
        CLOUD_FUNCTIONS.TASK_CREATE,
        {
          task_name: taskName.trim(),
          task_description: taskDescription.trim(),
          priority,
          category: groupName || undefined, // 兼容旧字段
          group_id: groupId || undefined,
          group_name: groupName || undefined,
          executor_id: executorId,
          executor_name: executorName,
          require_date: requireDate,
          repeat_type: repeatType,
          repeat_end_date: repeatEndDate || undefined
        }
      );

      if (res.success) {
        Taro.showToast({ title: '创建成功', icon: 'success' });
        // 延迟跳转到首页
        setTimeout(() => {
          console.log('[Create] 跳转到首页');
          Taro.reLaunch({ url: '/pages/index/index' });
        }, 1000);
      } else {
        Taro.showToast({ title: res.message || '创建失败', icon: 'none' });
      }
    } catch (err) {
      console.error('创建待办失败:', err);
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

  // 企业联系人选择回调
  const handleContactSelect = (selectedUsers: Array<{ userid: string; name: string }>) => {
    if (selectedUsers.length === 0) return;

    const selectedUser = selectedUsers[0];
    
    // 检查是否已存在，如果不存在则添加到执行人列表
    const existingIndex = executorList.findIndex(ex => ex.openid === selectedUser.userid);
    
    if (existingIndex >= 0) {
      setExecutorIndex(existingIndex);
    } else {
      const newExecutor: Executor = {
        id: selectedUser.userid,
        openid: selectedUser.userid,
        name: selectedUser.name
      };
      setExecutorList([...executorList, newExecutor]);
      setExecutorIndex(executorList.length);
    }
    
    Taro.showToast({
      title: `已选择：${selectedUser.name}`,
      icon: 'success'
    });
  };

  // 部门选择回调
  const handleDepartmentSelect = (department: { id: number; name: string }) => {
    setSelectedDepartment(department);
    
    // 根据部门筛选执行人（这里可以扩展为从后端获取部门成员）
    Taro.showToast({
      title: `已选择：${department.name}`,
      icon: 'success'
    });
  };

  // 分组选择（picker 的 range 包含分组列表 + "新增分组"）
  const getGroupPickerRange = () => {
    const groupNames = groups.map(g => g.name);
    return [...groupNames, '+ 新增分组'];
  };

  const onGroupChange = (e) => {
    const index = parseInt(e.detail.value);
    if (index === groups.length) {
      // 选择了"新增分组"
      setShowAddGroupDialog(true);
    } else {
      setGroupId(groups[index]._id);
      setGroupName(groups[index].name);
    }
  };

  return (
    <View className="min-h-screen bg-gray-50 pb-20">
      <View className="p-3 space-y-3">
        {/* 待办名称 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2 flex items-center">
              <Text className="text-red-500 mr-1">*</Text>
              <Text>待办名称</Text>
            </Label>
            <Input
              placeholder="请输入待办名称"
              placeholderClass="text-gray-400"
              value={taskName}
              onInput={(e) => setTaskName(e.detail.value)}
              maxlength={50}
              className="bg-gray-50 border-gray-200"
            />
          </CardContent>
        </Card>

        {/* 待办描述 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2">待办描述</Label>
            <Textarea
              placeholder="请输入待办描述（可选）"
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

        {/* 待办分组 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2">待办分组</Label>
            <Picker
              mode="selector"
              range={getGroupPickerRange()}
              value={groupId ? groups.findIndex(g => g._id === groupId) : 0}
              onChange={onGroupChange}
            >
              <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                <Text className={groupName ? 'text-gray-800' : 'text-gray-400'}>
                  {groupName || '选择分组（可选）'}
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
            
            {/* 企业微信环境：显示企业联系人选择按钮 */}
            {isWeworkEnv && (
              <View className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowContactSelect(true)}
                >
                  <Users size={16} className="mr-1" color="#1377EB" />
                  <Text className="text-xs">选择企业联系人</Text>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowDepartmentSelect(true)}
                >
                  <Building2 size={16} className="mr-1" color="#1377EB" />
                  <Text className="text-xs">选择部门</Text>
                </Button>
              </View>
            )}
            
            {/* 已选部门显示 */}
            {selectedDepartment && (
              <View className="flex items-center gap-2 mb-2 bg-blue-50 px-3 py-2 rounded-lg">
                <Building2 size={14} color="#1377EB" />
                <Text className="text-xs text-blue-700">{selectedDepartment.name}</Text>
                <Text 
                  className="text-xs text-blue-500 ml-auto cursor-pointer"
                  onClick={() => setSelectedDepartment(null)}
                >
                  清除
                </Text>
              </View>
            )}
            
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

        {/* 企业联系人选择对话框 */}
        <ContactSelect
          open={showContactSelect}
          onOpenChange={setShowContactSelect}
          onSelect={handleContactSelect}
          mode="single"
          type={['user']}
        />

        {/* 部门选择对话框 */}
        <DepartmentSelect
          open={showDepartmentSelect}
          onOpenChange={setShowDepartmentSelect}
          onSelect={handleDepartmentSelect}
        />

        {/* 截止日期 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-2 flex items-center">
              <Text className="text-red-500 mr-1">*</Text>
              <Text>截止日期</Text>
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

        {/* 重复设置 */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-sm text-gray-500 mb-3">重复设置</Label>
            <View className="grid grid-cols-4 gap-2 mb-3">
              {REPEAT_OPTIONS.map((item) => (
                <View
                  key={item.value}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                    repeatType === item.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => setRepeatType(item.value)}
                >
                  <Text className="text-sm font-medium">{item.label}</Text>
                  <Text className="text-xs text-gray-500">{item.desc}</Text>
                </View>
              ))}
            </View>
            
            {repeatType !== 'none' && (
              <View className="mt-2 pt-2 border-t border-gray-100">
                <Label className="text-xs text-gray-400 mb-1">重复截止日期（可选）</Label>
                <Picker mode="date" value={repeatEndDate} onChange={(e) => setRepeatEndDate(e.detail.value)}>
                  <View className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
                    <Text className={repeatEndDate ? 'text-gray-800' : 'text-gray-400'}>
                      {repeatEndDate || '不设置截止日期'}
                    </Text>
                    <Text className="text-gray-400">📅</Text>
                  </View>
                </Picker>
              </View>
            )}
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <Button
          className="w-full bg-blue-500 text-white rounded-lg py-3 text-base font-semibold"
          onClick={submitTask}
          disabled={submitting}
        >
          {submitting ? '创建中...' : '创建待办'}
        </Button>
      </View>

      {/* 新增分组对话框 */}
      {showAddGroupDialog && (
        <Dialog open={showAddGroupDialog} onOpenChange={setShowAddGroupDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>新增待办分组</DialogTitle>
            </DialogHeader>
            
            <View className="mt-4">
              <Input
                placeholder="请输入分组名称"
                value={newGroupName}
                onInput={(e) => setNewGroupName(e.detail.value)}
                maxlength={20}
                className="bg-gray-50 border-gray-200"
              />
            </View>
            
            <View className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddGroupDialog(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-blue-500 text-white"
                onClick={addNewGroup}
                disabled={addingGroup}
              >
                {addingGroup ? '添加中...' : '确定'}
              </Button>
            </View>
          </DialogContent>
        </Dialog>
      )}
    </View>
  );
}
