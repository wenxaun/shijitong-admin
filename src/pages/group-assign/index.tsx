import { View, Text, ScrollView, Checkbox } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import type { CloudResponse, Task, TaskGroup } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function GroupAssign() {
  const { openid } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'ungrouped'>('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      // H5 端使用模拟数据
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        // 加载分组
        const storedGroups = Taro.getStorageSync('mock_groups') || '[]';
        let groupList: TaskGroup[] = JSON.parse(storedGroups);
        
        if (groupList.length === 0) {
          groupList = [
            { _id: 'default1', name: '工作', user_id: 'test', order: 1, task_count: 3, created_at: new Date().toISOString() },
            { _id: 'default2', name: '个人', user_id: 'test', order: 2, task_count: 2, created_at: new Date().toISOString() }
          ];
          Taro.setStorageSync('mock_groups', JSON.stringify(groupList));
        }
        setGroups(groupList.sort((a, b) => a.order - b.order));
        
        // 加载任务
        const storedTasks = Taro.getStorageSync('mock_tasks') || '[]';
        let taskList: Task[] = JSON.parse(storedTasks);
        
        if (taskList.length === 0) {
          const currentOpenid = openid || 'test';
          taskList = [
            { _id: 't1', task_id: 't1', task_name: '完成项目报告', status: 'pending', priority: 'P1', publisher_id: currentOpenid, require_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), group_id: 'default1' },
            { _id: 't2', task_id: 't2', task_name: '整理会议纪要', status: 'pending', priority: 'P2', publisher_id: currentOpenid, require_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), group_id: 'default1' },
            { _id: 't3', task_id: 't3', task_name: '学习新技术', status: 'pending', priority: 'P2', publisher_id: currentOpenid, require_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), group_id: 'default2' },
            { _id: 't4', task_id: 't4', task_name: '健身锻炼', status: 'pending', priority: 'P3', publisher_id: currentOpenid, require_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), group_id: 'default2' },
            { _id: 't5', task_id: 't5', task_name: '未分组任务1', status: 'pending', priority: 'P2', publisher_id: currentOpenid, require_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { _id: 't6', task_id: 't6', task_name: '未分组任务2', status: 'pending', priority: 'P3', publisher_id: currentOpenid, require_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          ];
          Taro.setStorageSync('mock_tasks', JSON.stringify(taskList));
        }
        
        setTasks(taskList);
        return;
      }
      
      // 小程序端
      const [groupsRes, tasksRes] = await Promise.all([
        callFunction<CloudResponse<{ groups: TaskGroup[] }>>('group-list', {}),
        callFunction<CloudResponse<{ tasks: Task[] }>>('task-list', {})
      ]);
      
      if (groupsRes.success && groupsRes.data) {
        setGroups(groupsRes.data.groups || []);
      }
      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data.tasks || []);
      }
    } catch (err) {
      console.error('[GroupAssign] 加载数据失败:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  // 过滤后的任务列表
  const filteredTasks = tasks.filter(task => {
    if (filter === 'ungrouped') {
      return !task.group_id;
    }
    return true;
  });

  // 切换任务选择
  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // 全选/取消全选
  const toggleAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t._id));
    }
  };

  // 移动到分组
  const moveToGroup = async () => {
    if (selectedTasks.length === 0) {
      Taro.showToast({ title: '请选择任务', icon: 'none' });
      return;
    }
    if (!selectedGroup) {
      Taro.showToast({ title: '请选择目标分组', icon: 'none' });
      return;
    }
    
    setSubmitting(true);
    try {
      const targetGroup = groups.find(g => g._id === selectedGroup);
      
      // H5 端
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        const updatedTasks = tasks.map(t => {
          if (selectedTasks.includes(t._id)) {
            return { 
              ...t, 
              group_id: selectedGroup, 
              group_name: targetGroup?.name,
              updated_at: new Date().toISOString() 
            };
          }
          return t;
        });
        
        Taro.setStorageSync('mock_tasks', JSON.stringify(updatedTasks));
        setTasks(updatedTasks);
        setSelectedTasks([]);
        setSelectedGroup('');
        Taro.showToast({ title: '移动成功', icon: 'success' });
        return;
      }
      
      // 小程序端
      const res = await callFunction<CloudResponse>('task-batch-update', {
        task_ids: selectedTasks,
        updates: {
          group_id: selectedGroup,
          group_name: targetGroup?.name
        }
      });
      
      if (res.success) {
        const updatedTasks = tasks.map(t => {
          if (selectedTasks.includes(t._id)) {
            return { 
              ...t, 
              group_id: selectedGroup, 
              group_name: targetGroup?.name,
              updated_at: new Date().toISOString()
            };
          }
          return t;
        });
        setTasks(updatedTasks);
        setSelectedTasks([]);
        setSelectedGroup('');
        Taro.showToast({ title: '移动成功', icon: 'success' });
      } else {
        Taro.showToast({ title: res.message || '移动失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[GroupAssign] 移动任务失败:', err);
      Taro.showToast({ title: '移动失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 获取任务所属分组名称
  const getTaskGroupName = (task: Task) => {
    if (!task.group_id) return '未分组';
    const group = groups.find(g => g._id === task.group_id);
    return group?.name || '未知分组';
  };

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 筛选标签 */}
      <View className="bg-white px-3 py-2 flex items-center gap-2 border-b border-gray-100">
        <View 
          className={`px-3 py-1 rounded-full ${filter === 'all' ? 'bg-blue-500' : 'bg-gray-100'}`}
          onClick={() => setFilter('all')}
        >
          <Text className={filter === 'all' ? 'text-white' : 'text-gray-600'}>全部任务</Text>
        </View>
        <View 
          className={`px-3 py-1 rounded-full ${filter === 'ungrouped' ? 'bg-blue-500' : 'bg-gray-100'}`}
          onClick={() => setFilter('ungrouped')}
        >
          <Text className={filter === 'ungrouped' ? 'text-white' : 'text-gray-600'}>未分组</Text>
        </View>
      </View>

      <ScrollView className="flex-1" scrollY style={{ height: 'calc(100vh - 120px)' }}>
        <View className="p-3 space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="flex items-center py-2">
                    <Skeleton className="w-5 h-5 rounded mr-3" />
                    <Skeleton className="h-4 w-32 flex-1" />
                  </View>
                ))}
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-16">
              <Text className="text-gray-400 mb-2">暂无{filter === 'ungrouped' ? '未分组' : ''}任务</Text>
            </View>
          ) : (
            <>
              {/* 操作栏 */}
              <View className="flex items-center justify-between">
                <View className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedTasks.length === filteredTasks.length}
                    value="all"
                    onChange={toggleAll}
                  />
                  <Text className="text-sm text-gray-600">
                    已选 {selectedTasks.length}/{filteredTasks.length} 项
                  </Text>
                </View>
              </View>

              {/* 任务列表 */}
              <Card>
                <CardContent className="p-0">
                  {filteredTasks.map((task, index) => (
                    <View key={task._id}>
                      <View 
                        className="flex items-center px-4 py-3 active:bg-gray-50"
                        onClick={() => toggleTask(task._id)}
                      >
                        <Checkbox 
                          checked={selectedTasks.includes(task._id)}
                          value={task._id}
                          className="mr-3"
                        />
                        <View className="flex-1">
                          <Text className="text-base text-gray-800">{task.task_name}</Text>
                          <Text className="text-xs text-gray-400 mt-1">
                            {getTaskGroupName(task)} · {task.priority}
                          </Text>
                        </View>
                      </View>
                      {index < filteredTasks.length - 1 && <Separator className="mx-4" />}
                    </View>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      {selectedTasks.length > 0 && (
        <View className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex items-center gap-3" style={{ paddingBottom: '20px' }}>
          <View className="flex-1">
            <View 
              className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200"
              onClick={() => {
                Taro.showActionSheet({
                  itemList: groups.map(g => g.name),
                  success: (res) => {
                    setSelectedGroup(groups[res.tapIndex]._id);
                  }
                });
              }}
            >
              <Text className={selectedGroup ? 'text-gray-800' : 'text-gray-400'}>
                {selectedGroup ? groups.find(g => g._id === selectedGroup)?.name : '选择目标分组'}
              </Text>
              <Text className="text-gray-400">▼</Text>
            </View>
          </View>
          <Button 
            className="bg-blue-500 text-white px-6"
            onClick={moveToGroup}
            disabled={submitting || !selectedGroup}
          >
            {submitting ? '移动中...' : '移动'}
          </Button>
        </View>
      )}
    </View>
  );
}
