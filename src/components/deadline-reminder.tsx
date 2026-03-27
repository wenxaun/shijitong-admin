/**
 * 截止日期提醒弹窗组件
 * 
 * 在任务截止当天显示提醒，询问用户是否需要上报异常
 */

import { View, Text } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircleAlert, Clock } from 'lucide-react-taro';
import { 
  getReminderSettings, 
  getTodayDeadlineTasks, 
  markReminderShown, 
  hasReminderShown,
  navigateToException 
} from '@/services/reminder';
import { useUserStore } from '@/stores/user';
import type { DeadlineTask } from '@/services/reminder';

interface DeadlineReminderProps {
  onClose?: () => void;
}

export function DeadlineReminder({ onClose }: DeadlineReminderProps) {
  const { openid } = useUserStore();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<DeadlineTask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // 检查是否需要显示提醒
  const checkAndShowReminder = useCallback(async () => {
    if (!openid) return;

    const settings = getReminderSettings();
    if (!settings.enableReminder) return;

    try {
      const deadlineTasks = await getTodayDeadlineTasks(openid);
      
      // 过滤掉已经显示过提醒的任务
      const unshownTasks = deadlineTasks.filter(task => !hasReminderShown(task._id));
      
      if (unshownTasks.length > 0) {
        setTasks(unshownTasks);
        setCurrentTaskIndex(0);
        setOpen(true);
      }
    } catch (err) {
      console.error('检查提醒失败:', err);
    }
  }, [openid]);

  useEffect(() => {
    // 页面加载后延迟检查
    const timer = setTimeout(() => {
      checkAndShowReminder();
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkAndShowReminder]);

  // 关闭弹窗
  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  // 稍后提醒（记录已显示，明天再次提醒）
  const handleLater = () => {
    if (tasks[currentTaskIndex]) {
      markReminderShown(tasks[currentTaskIndex]._id);
    }

    // 如果还有下一个任务，显示下一个
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  // 上报异常
  const handleReportException = () => {
    const task = tasks[currentTaskIndex];
    if (task) {
      markReminderShown(task._id);
      setOpen(false);
      navigateToException(task._id);
    }
  };

  // 正常推进
  const handleContinue = () => {
    if (tasks[currentTaskIndex]) {
      markReminderShown(tasks[currentTaskIndex]._id);
    }

    // 如果还有下一个任务，显示下一个
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  if (tasks.length === 0) return null;

  const currentTask = tasks[currentTaskIndex];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CircleAlert size={20} color="#F97316" className="mr-2" />
            任务截止提醒
          </DialogTitle>
        </DialogHeader>

        <View className="py-4">
          {/* 任务信息 */}
          <View className="bg-orange-50 rounded-lg p-3 mb-4">
            <Text className="text-base font-semibold text-gray-800 mb-2">{currentTask?.task_name}</Text>
            <View className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-600">
                <Clock size={12} color="#EA580C" className="mr-1" />
                今日截止
              </Badge>
            </View>
          </View>

          {/* 提示信息 */}
          <View className="bg-blue-50 rounded-lg p-3 mb-4">
            <Text className="text-sm text-blue-600">
              该任务今日截止，请确认是否需要上报异常（延期或申请协助）。
            </Text>
            <Text className="text-xs text-blue-400 mt-1">
              如不上报异常且逾期完成，可能影响任务评分。
            </Text>
          </View>

          {/* 进度指示 */}
          {tasks.length > 1 && (
            <View className="flex items-center justify-center mb-4">
              <Text className="text-xs text-gray-400">
                {currentTaskIndex + 1} / {tasks.length} 个任务待确认
              </Text>
            </View>
          )}
        </View>

        <DialogFooter className="flex-col gap-2">
          <View className="flex gap-2 w-full">
            <Button
              className="flex-1 bg-orange-500 text-white"
              onClick={handleReportException}
            >
              <CircleAlert size={16} color="#ffffff" />
              <Text className="text-white ml-1">上报异常</Text>
            </Button>
            <Button
              className="flex-1 bg-blue-500 text-white"
              onClick={handleContinue}
            >
              <Text className="text-white">正常推进</Text>
            </Button>
          </View>
          <Button
            className="w-full bg-gray-100 text-gray-600"
            onClick={handleLater}
          >
            <Text className="text-gray-600">稍后提醒</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
