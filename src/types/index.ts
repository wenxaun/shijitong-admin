/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * 任务优先级
 */
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * 任务类型
 */
export interface Task {
  _id: string;
  task_id: string;
  task_name: string;
  task_description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  publisher_id: string;
  publisher_name?: string;
  executor_id?: string;
  executor_name?: string;
  require_date: string;
  complete_date?: string;
  score?: number | null;
  score_note?: string;
  learnings?: string;
  delay_reason?: string;
  improvements?: string;
  attribution_tags?: string[];
  subtask_count?: number;
  progress?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 用户类型
 */
export interface User {
  _id: string;
  openid: string;
  appid?: string;
  nickname: string;
  avatar_url?: string;
  role: 'executor' | 'publisher' | 'admin';
  created_at: string;
  last_login: string;
}

/**
 * 团队类型
 */
export interface Team {
  _id: string;
  name: string;
  description?: string;
  leader_id: string;
  members: string[];
  created_at: string;
}

/**
 * 部门类型
 */
export interface Department {
  _id: string;
  name: string;
  org_id: string;
  leader_id?: string;
  members: string[];
  created_at: string;
}

/**
 * 组织类型
 */
export interface Organization {
  _id: string;
  name: string;
  creator_id: string;
  created_at: string;
}

/**
 * 子任务类型
 */
export interface Subtask {
  _id: string;
  parent_task_id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
}

/**
 * 云函数响应包装
 */
export interface CloudResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * 任务列表响应
 */
export interface TaskListResponse {
  tasks: Task[];
  hasMore: boolean;
  total: number;
}
