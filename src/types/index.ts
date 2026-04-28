/**
 * 企业微信类型声明
 */

// 企业微信选择企业联系人结果
export interface EnterpriseContactResult {
  errMsg: string;
  result: {
    userList?: Array<{
      userid: string;
      name: string;
      avatar?: string;
    }>;
    departmentList?: Array<{
      id: number;
      name: string;
    }>;
  };
}

// 企业微信部门信息
export interface WecomDepartment {
  id: number;
  name: string;
  parentid: number;
}

// 企业微信获取部门结果
export interface GetDepartmentResult {
  errMsg: string;
  department?: Department[];
}

/**
 * 用户类型
 */
export type UserType = 'personal' | 'enterprise';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'exception' | 'pending_review';

/**
 * 任务优先级
 */
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * 任务来源类型
 */
export type TaskSourceType = 'manual' | 'chat_share';

/**
 * 任务来源信息
 */
export interface TaskSource {
  type: TaskSourceType;           // 来源类型：手动创建/聊天分享
  source_name?: string;           // 来源名称（群名/联系人名）
  source_type?: 'group' | 'private'; // 聊天类型：群聊/私聊
  original_content?: string;      // 原始分享内容
  shared_at?: string;             // 分享时间
}

/**
 * 任务类型
 */
export interface Task {
  _id: string;
  task_id: string;
  user_type: UserType;          // 用户类型：个人用户/企业用户
  task_name: string;
  task_description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  group_id?: string;            // 任务分组（个人任务分组，如"紧急任务"）
  group_name?: string;
  org_team_id?: string;         // 归属团队/部门 ID（企业组织架构）
  org_team_name?: string;       // 归属团队/部门名称
  publisher_id: string;
  publisher_name?: string;
  executor_id?: string;
  executor_name?: string;
  reviewer_id?: string;         // 审核人 openid（任务审批）
  reviewer_name?: string;       // 审核人姓名
  watchers?: string[];          // 关注人列表（openid）
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
  hidden_for_users?: string[]; // 对特定用户隐藏（软删除）
  hidden_at?: string; // 隐藏时间
  // 来源追溯字段
  source?: TaskSource;           // 任务来源信息
  // 重复任务字段
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'; // 重复类型
  repeat_end_date?: string;      // 重复截止日期
  repeat_parent_id?: string;     // 原始任务ID（用于追踪重复任务来源）
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
  user_type: UserType;         // 用户类型：个人用户/企业用户
  nickname: string;
  avatar_url?: string;
  role: 'executor' | 'publisher' | 'admin' | 'owner'; // 新增 owner 角色
  created_at: string;
  last_login: string;
  
  // 汇报关系（独立于团队功能）
  manager_id?: string;           // 直属上级 openid
  manager_name?: string;         // 直属上级姓名
  report_to?: string[];          // 汇报对象 openid 列表
  receive_daily?: boolean;       // 是否接收日报
  receive_weekly?: boolean;      // 是否接收周报
  
  // 企业微信关联（预留，后续企业微信接入使用）
  is_wework_user?: boolean;      // 是否企业微信用户
  wecom_userid?: string;         // 企业微信成员 UserID
  wecom_corpid?: string;         // 所属企业 ID
  department_id?: string;        // 主部门 ID（保留兼容性）
  department_name?: string;      // 主部门名称
  department_ids?: string[];     // 所属部门 ID 列表（扩展）
  job_title?: string;            // 职位
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
 * 任务分组
 */
export interface TaskGroup {
  _id: string;
  name: string;
  user_id: string;
  user_type: UserType;          // 用户类型：个人用户/企业用户
  order: number;
  task_count?: number;
  created_at: string;
}

/**
 * 功能菜单项
 */
export interface MenuItem {
  icon: string;
  label: string;
  path: string;
  order?: number;
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

/**
 * 任务操作日志
 */
export interface TaskLog {
  _id: string;
  task_id: string;
  action_type: 'create' | 'update' | 'delete' | 'complete' | 'cancel' | 'assign' | 'priority' | 'status' | 'score' | 'exception' | 'follow' | 'unfollow';
  action_detail: string;
  operator_id: string;
  operator_name: string;
  created_at: string;
}

/**
 * 任务关注
 */
export interface TaskFollow {
  _id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
}
