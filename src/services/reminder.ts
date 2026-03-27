/**
 * 任务提醒服务
 * 
 * 功能：
 * 1. 检查今天截止的任务
 * 2. 根据设置发送提醒
 * 3. 提供异常上报快捷入口
 */

import Taro from '@tarojs/taro';
import { callFunction } from '@/utils/cloud';
import type { Task, CloudResponse } from '@/types';

export interface ReminderSettings {
  enableReminder: boolean;
  reminderTime: string;
}

export interface DeadlineTask {
  _id: string;
  task_id: string;
  task_name: string;
  require_date: string;
  status: string;
  executor_id?: string;
}

/**
 * 获取提醒设置
 */
export const getReminderSettings = (): ReminderSettings => {
  const stored = Taro.getStorageSync('userSettings');
  return {
    enableReminder: stored?.enableReminder ?? true,
    reminderTime: stored?.reminderTime ?? '16:00'
  };
};

/**
 * 检查是否需要显示提醒
 * 条件：今天是任务截止日期，且任务未完成
 */
export const checkDeadlineReminder = (task: Task): boolean => {
  if (task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(task.require_date);
  deadline.setHours(0, 0, 0, 0);

  // 检查今天是否是截止日期
  return today.getTime() === deadline.getTime();
};

/**
 * 获取今天截止的任务列表
 */
export const getTodayDeadlineTasks = async (_openid: string): Promise<DeadlineTask[]> => {
  try {
    const res = await callFunction<CloudResponse<{ tasks: DeadlineTask[] }>>(
      'task-list',
      {
        status: 'pending,in_progress',
        time_filter: 'today'
      }
    );

    if (res.success && res.data?.tasks) {
      // 过滤出今天截止的任务
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return res.data.tasks.filter(task => {
        const deadline = new Date(task.require_date);
        deadline.setHours(0, 0, 0, 0);
        return today.getTime() === deadline.getTime();
      });
    }

    return [];
  } catch (err) {
    console.error('获取截止任务失败:', err);
    return [];
  }
};

/**
 * 检查当前时间是否在提醒时间范围内
 */
export const isReminderTime = (reminderTime: string): boolean => {
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);

  // 当前时间在提醒时间前后30分钟内
  const diff = Math.abs(now.getTime() - reminderDate.getTime());
  return diff <= 30 * 60 * 1000;
};

/**
 * 标记提醒已显示（避免重复提醒）
 */
export const markReminderShown = (taskId: string) => {
  const today = new Date().toDateString();
  const key = `reminder_shown_${taskId}_${today}`;
  Taro.setStorageSync(key, true);
};

/**
 * 检查提醒是否已显示
 */
export const hasReminderShown = (taskId: string): boolean => {
  const today = new Date().toDateString();
  const key = `reminder_shown_${taskId}_${today}`;
  return Taro.getStorageSync(key) === true;
};

/**
 * 跳转到异常上报页面
 */
export const navigateToException = (taskId: string) => {
  Taro.navigateTo({
    url: `/pages/exception/index?id=${taskId}`
  });
};
