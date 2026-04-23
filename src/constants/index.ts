/**
 * 公共常量定义
 * 统一管理状态、优先级、时间筛选等常量
 */

import type { TaskStatus, TaskPriority } from '@/types';

/**
 * 任务状态映射
 */
export const STATUS_MAP: Record<TaskStatus | 'deleted', { label: string; bgClass: string; color: string }> = {
  pending: { label: '待办', bgClass: 'bg-gray-100 text-gray-600', color: '#6B7280' },
  in_progress: { label: '进行中', bgClass: 'bg-blue-50 text-blue-600', color: '#1377EB' },
  completed: { label: '已完成', bgClass: 'bg-green-50 text-green-600', color: '#00B365' },
  cancelled: { label: '已取消', bgClass: 'bg-red-50 text-red-500', color: '#EA4335' },
  exception: { label: '异常', bgClass: 'bg-orange-50 text-orange-600', color: '#F97316' },
  deleted: { label: '已删除', bgClass: 'bg-gray-100 text-gray-400', color: '#9CA3AF' }
};

/**
 * 优先级样式映射
 */
export const PRIORITY_STYLE: Record<TaskPriority, { bg: string; text: string; border: string; badge: string }> = {
  P0: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-500', badge: 'bg-red-100 text-red-600' },
  P1: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-500', badge: 'bg-orange-100 text-orange-600' },
  P2: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-500', badge: 'bg-blue-100 text-blue-600' },
  P3: { bg: 'bg-gray-100', text: 'text-gray-400', border: 'border-gray-300', badge: 'bg-gray-100 text-gray-600' }
};

/**
 * 优先级选项
 */
export const PRIORITY_OPTIONS: { value: TaskPriority | ''; label: string; desc?: string }[] = [
  { value: '', label: '全部优先级' },
  { value: 'P0', label: 'P0', desc: '紧急重要' },
  { value: 'P1', label: 'P1', desc: '重要' },
  { value: 'P2', label: 'P2', desc: '普通' },
  { value: 'P3', label: 'P3', desc: '次要' }
];

/**
 * 时间筛选选项
 */
export const TIME_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' }
] as const;

/**
 * 状态筛选选项（用于任务列表页）
 */
export const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' }
] as const;

/**
 * 获取分数颜色
 */
export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#00B365';
  if (score >= 60) return '#FF7D27';
  return '#EA4335';
};

/**
 * 获取分数 Tailwind 类名
 */
export const getScoreClassName = (score: number): string => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-orange-500';
  return 'text-red-500';
};
