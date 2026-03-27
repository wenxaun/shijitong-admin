import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/user';
import { callFunction } from '@/utils/cloud';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, ChevronRight } from 'lucide-react-taro';

interface Task {
  _id: string;
  task_id: string;
  task_name: string;
  require_date: string;
  status: string;
  priority: string;
}

export function DeadlineReminder() {
  const { openid } = useUserStore();
  const [showDialog, setShowDialog] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);

  useEffect(() => {
    checkDeadline();
  }, [openid]);

  // 页面显示时检查
  Taro.useDidShow(() => {
    checkDeadline();
  });

  const checkDeadline = async () => {
    if (!openid) return;

    try {
      const res = await callFunction<{ success: boolean; data?: { tasks: Task[] } }>(
        'task-list',
        { status: 'in_progress', time_filter: 'today' }
      );

      if (res.success && res.data?.tasks) {
        // 筛选出今天截止的任务
        const today = new Date().toISOString().split('T')[0];
        const urgent = res.data.tasks.filter(task => {
          return task.require_date === today;
        });

        if (urgent.length > 0) {
          setUrgentTasks(urgent);
          setShowDialog(true);
        }
      }
    } catch (err) {
      console.error('检查截止日期失败:', err);
    }
  };

  const goDetail = (taskId: string) => {
    setShowDialog(false);
    Taro.navigateTo({ url: `/pages/detail/index?id=${taskId}` });
  };

  const handleClose = () => {
    setShowDialog(false);
  };

  if (!showDialog || urgentTasks.length === 0) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell size={20} color="#F97316" />
            <Text>截止日期提醒</Text>
          </DialogTitle>
        </DialogHeader>

        <View className="py-4">
          <Text className="text-sm text-gray-500 mb-3">
            以下任务今天截止，请及时处理：
          </Text>

          {urgentTasks.slice(0, 3).map((task) => (
            <View
              key={task._id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 active:bg-gray-100"
              onClick={() => goDetail(task.task_id)}
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                  {task.task_name}
                </Text>
                <View className="flex items-center gap-1 mt-1">
                  <Calendar size={12} color="#9CA3AF" />
                  <Text className="text-xs text-gray-400">{task.require_date}</Text>
                </View>
              </View>
              <View className="flex items-center gap-2">
                <Badge
                  className={`text-xs ${
                    task.priority === 'P0'
                      ? 'bg-red-50 text-red-500'
                      : task.priority === 'P1'
                        ? 'bg-orange-50 text-orange-500'
                        : 'bg-blue-50 text-blue-500'
                  }`}
                >
                  {task.priority}
                </Badge>
                <ChevronRight size={16} color="#D1D5DB" />
              </View>
            </View>
          ))}

          {urgentTasks.length > 3 && (
            <Text className="text-xs text-gray-400 text-center mt-2">
              还有 {urgentTasks.length - 3} 个任务...
            </Text>
          )}
        </View>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            稍后处理
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
