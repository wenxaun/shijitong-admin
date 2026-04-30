export interface AdminUser {
  id: string
  username: string
  name: string
  role: string
}

export interface LoginResult {
  token: string
  user: AdminUser
}

export interface UserRecord {
  _id: string
  openid: string
  nickname: string
  avatar_url: string
  user_type: 'personal' | 'enterprise'
  corp_id?: string
  corp_name?: string
  department?: { id: string; name: string }
  role?: string
  created_at: string
}

export type UserRole = 'member' | 'admin' | 'owner'

export interface RoleFeatures {
  task_enabled: boolean
  team_enabled: boolean
  enterprise_enabled: boolean
  notification_enabled: boolean
  weekly_report_enabled: boolean
  voice_input_enabled: boolean
  config_access: boolean
}

export interface RoleLimits {
  max_tasks_per_user: number
  max_subtasks_per_task: number
  max_team_members: number
}

export interface AppConfig {
  _id?: string
  role_config: {
    member: { features: RoleFeatures; limits: RoleLimits }
    admin: { features: RoleFeatures; limits: RoleLimits }
    owner: { features: RoleFeatures; limits: RoleLimits }
  }
  updated_at?: string
  updated_by?: string
}

export interface AuthorizedSubject {
  user_id: string
  openid: string
  nickname: string
  permissions: string[]
  created_at: string
}

export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}
