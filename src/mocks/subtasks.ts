/**
 * 子任务模拟数据
 */

interface MockSubtask {
  _id: string;
  parent_task_id: string;
  task_name: string;
  name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'exception';
  executor_id?: string;
  executor_name?: string;
  require_date?: string;
  due_date?: string;
  created_at?: string;
}

/**
 * 创建模拟子任务数据
 */
export const createMockSubtasks = (): MockSubtask[] => [
  {
    _id: 'mock_subtask_1',
    parent_task_id: 'mock_task_1',
    task_name: '子任务 1 - 需求分析',
    name: '子任务 1 - 需求分析',
    status: 'completed',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  },
  {
    _id: 'mock_subtask_2',
    parent_task_id: 'mock_task_1',
    task_name: '子任务 2 - 设计方案',
    name: '子任务 2 - 设计方案',
    status: 'in_progress',
    executor_id: 'mock_openid',
    executor_name: '测试用户',
    require_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }
];

// 子任务数据存储
let mockSubtasks: MockSubtask[] = createMockSubtasks();

/**
 * 获取子任务列表
 */
export const getMockSubtasks = (): MockSubtask[] => mockSubtasks;

/**
 * 设置子任务列表
 */
export const setMockSubtasks = (subtasks: MockSubtask[]): void => {
  mockSubtasks = subtasks;
};

/**
 * 添加子任务
 */
export const addMockSubtask = (subtask: MockSubtask): void => {
  mockSubtasks.push(subtask);
};

/**
 * 更新子任务
 */
export const updateMockSubtask = (subtaskId: string, updates: Partial<MockSubtask>): boolean => {
  const index = mockSubtasks.findIndex(s => s._id === subtaskId);
  if (index >= 0) {
    mockSubtasks[index] = {
      ...mockSubtasks[index],
      ...updates
    };
    return true;
  }
  return false;
};

/**
 * 删除子任务
 */
export const deleteMockSubtask = (subtaskId: string): boolean => {
  const index = mockSubtasks.findIndex(s => s._id === subtaskId);
  if (index >= 0) {
    mockSubtasks.splice(index, 1);
    return true;
  }
  return false;
};

/**
 * 获取单个子任务
 */
export const getMockSubtask = (subtaskId: string): MockSubtask | undefined => {
  return mockSubtasks.find(s => s._id === subtaskId);
};

/**
 * 获取任务的所有子任务
 */
export const getMockSubtasksByParentId = (parentTaskId: string): MockSubtask[] => {
  return mockSubtasks.filter(s => s.parent_task_id === parentTaskId);
};

/**
 * 重置模拟数据
 */
export const resetMockSubtasks = (): void => {
  mockSubtasks = createMockSubtasks();
};
