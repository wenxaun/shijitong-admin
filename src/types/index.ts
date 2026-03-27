/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'exception';

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
  // 异常相关字段
  exception_type?: 'delay' | 'assist';
  exception_reason?: string;
  new_deadline?: string;
  assist_user_id?: string;
  has_exception?: boolean; // 是否已上报异常
  exception_approved?: boolean; // 异常申请是否已批准
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
 * 团队成员角色
 */
export type TeamMemberRole = 'owner' | 'admin' | 'member';

/**
 * 团队成员权限
 */
export interface TeamMemberPermissions {
  can_create_task: boolean;      // 创建任务
  can_assign_task: boolean;      // 分配任务
  can_view_all_tasks: boolean;   // 查看所有任务
  can_edit_team: boolean;        // 编辑团队信息
  can_invite_member: boolean;    // 邀请成员
  can_remove_member: boolean;    // 移除成员
}

/**
 * 团队成员
 */
export interface TeamMember {
  openid: string;
  nickname: string;
  avatar_url?: string;
  role: TeamMemberRole;
  permissions: TeamMemberPermissions;
  joined_at: string;
  task_count?: number;           // 任务数量
  completed_count?: number;      // 完成数量
}

/**
 * 邀请链接
 */
export interface InviteLink {
  _id: string;
  team_id: string;
  team_name: string;
  inviter_id: string;
  inviter_name: string;
  invite_code: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  created_at: string;
}

/**
 * 团队类型
 */
export interface Team {
  _id: string;
  name: string;
  description?: string;
  leader_id: string;
  leader_name?: string;
  members: string[];
  member_details?: TeamMember[];
  invite_code?: string;
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
  task_name: string;
  description?: string;
  task_description?: string;
  status: TaskStatus;
  executor_id?: string;
  executor_name?: string;
  require_date?: string;
  due_date?: string;
  priority?: TaskPriority;
  is_subtask?: boolean;
  checklist?: ChecklistItem[];
  flow_history?: FlowHistory[];
  collaborators?: Collaborator[];
  created_at: string;
}

/**
 * 检查清单项
 */
export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: number | null;
}

/**
 * 流转历史
 */
export interface FlowHistory {
  from_executor: string;
  from_executor_name?: string;
  to_executor: string;
  to_executor_name?: string;
  reason?: string;
  note?: string;
  flow_date: string | number;
}

/**
 * 协助人
 */
export interface Collaborator {
  openid: string;
  name: string;
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
