/**
 * 任务模拟数据
 */

import type { Task } from '@/types';

/**
 * 创建模拟任务数据
 */
export const createMockTasks = (): Task[] => [
  {
    _id: 'mock_task_1',
    task_id: 'mock_task_1',
    task_name: '示例任务 1（已完成）',
    user_type: 'personal' as const,
    task_description: '这是一个已完成的示例任务，评分80分。',
    status: 'completed',
    priority: 'P1',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date().toISOString().split('T')[0],
    score: 80,
    score_note: '按时完成',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    _id: 'mock_task_2',
    task_id: 'mock_task_2',
    user_type: 'personal' as const,
    task_name: '示例任务 2（逾期完成）',
    task_description: '这是一个逾期完成的示例任务，评分65分。',
    status: 'completed',
    priority: 'P2',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    score: 65,
    score_note: '逾期3天完成',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    _id: 'mock_task_3',
    user_type: 'personal' as const,
    task_id: 'mock_task_3',
    task_name: '示例任务 3（进行中）',
    task_description: '这是一个进行中的示例任务。',
    status: 'in_progress',
    priority: 'P2',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    user_type: 'personal' as const,
    _id: 'mock_task_4',
    task_id: 'mock_task_4',
    task_name: '示例任务 4（待办）',
    task_description: '这是一个待办的示例任务。',
    status: 'pending',
    priority: 'P1',
    publisher_id: 'mock_openid',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// 任务数据存储
let mockTasks: Task[] = createMockTasks();

/**
 * 获取任务列表
 */
export const getMockTasks = (): Task[] => mockTasks;

/**
 * 设置任务列表
 */
export const setMockTasks = (tasks: Task[]): void => {
  mockTasks = tasks;
};

/**
 * 添加任务
 */
export const addMockTask = (task: Task): void => {
  mockTasks.unshift(task);
};

/**
 * 更新任务
 */
export const updateMockTask = (taskId: string, updates: Partial<Task>): boolean => {
  const index = mockTasks.findIndex(t => t.task_id === taskId || t._id === taskId);
  if (index >= 0) {
    mockTasks[index] = {
      ...mockTasks[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return true;
  }
  return false;
};

/**
 * 删除任务
 */
export const deleteMockTask = (taskId: string): boolean => {
  const index = mockTasks.findIndex(t => t.task_id === taskId || t._id === taskId);
  if (index >= 0) {
    mockTasks.splice(index, 1);
    return true;
  }
  return false;
};

/**
 * 获取单个任务
 */
export const getMockTask = (taskId: string): Task | undefined => {
  return mockTasks.find(t => t.task_id === taskId || t._id === taskId);
};

/**
 * 重置模拟数据
 */
export const resetMockTasks = (): void => {
  mockTasks = createMockTasks();
};
