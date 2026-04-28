/**
 * 配置管理系统类型定义
 */

// 配置分类
export enum ConfigCategory {
  SYSTEM = 'system',           // 系统基础配置
  FEATURE = 'feature',         // 功能开关配置
  WECOM = 'wecom',            // 企微相关配置
  TEXT = 'text',              // 文案配置
  BUSINESS = 'business',      // 业务规则配置
}

// 配置记录
export interface ConfigRecord {
  id: string
  key: string                 // 配置键（如：feature.taskReview）
  value: any                  // 配置值（JSON）
  description: string         // 描述
  category: ConfigCategory
  dataType: 'boolean' | 'number' | 'string' | 'object' | 'array'
  isPublic: boolean           // 是否公开（前端可见）
  updatedAt: Date
  updatedBy: string           // 更新人
}

// 配置版本
export interface ConfigVersion {
  id: string
  version: string             // 版本号（如：1.0.0）
  configSnapshot: Record<string, any>  // 配置快照
  changes: ConfigChange[]     // 变更记录
  createdAt: Date
  createdBy: string
  comment: string            // 变更备注
}

// 配置变更
export interface ConfigChange {
  key: string
  oldValue: any
  newValue: any
  type: 'added' | 'modified' | 'deleted'
}

// 系统基础配置
export interface SystemConfig {
  version: string              // 配置版本号
  environment: 'dev' | 'prod'  // 环境标识
  apiTimeout: number          // 请求超时时间
  cacheTimeout: number        // 配置缓存时间（秒）
}

// 功能开关配置
export interface FeatureConfig {
  taskReview: boolean         // 任务审核功能
  orgSync: boolean            // 组织架构同步
  wecomNotify: boolean        // 企微消息推送
  voiceInput: boolean         // 语音输入
  taskTransfer: boolean       // 任务流转
  aiAnalysis: boolean         // AI 分析
  statistics: boolean         // 统计功能
}

// 企微配置
export interface WecomConfig {
  corpId: string              // 企业ID
  agentId: number             // 应用ID
  syncInterval: number        // 同步间隔（小时）
  maxDepartments: number      // 最大部门数限制
  notifyTemplateId: string    // 消息模板ID
  autoSync: boolean           // 自动同步
}

// 文案配置
export interface TextConfig {
  appName: string             // 应用名称
  welcomeText: string         // 欢迎文案
  errorMessages: Record<string, string>
  successMessages: Record<string, string>
}

// 业务规则配置
export interface BusinessConfig {
  maxTasksPerDay: number      // 每日最大任务数
  maxSubtasksPerTask: number  // 每个任务最大子任务数
  taskAutoArchiveDays: number // 任务自动归档天数
  maxTeamMembers: number      // 团队最大成员数
  taskAutoCloseHours: number  // 任务自动关闭时间（小时）
}

// 完整应用配置
export interface AppConfig {
  system: SystemConfig
  features: FeatureConfig
  wecom: WecomConfig
  texts: TextConfig
  business: BusinessConfig
  _version: string            // 配置版本号
  _updatedAt: string          // 更新时间
}

// 配置操作日志
export interface ConfigAuditLog {
  id: string
  configKey: string
  action: 'create' | 'update' | 'delete' | 'rollback'
  oldValue: any
  newValue: any
  operator: string
  operatorIp: string
  createdAt: Date
}

// 配置验证规则
export interface ConfigValidationRule {
  type: 'range' | 'pattern' | 'enum' | 'required'
  min?: number
  max?: number
  pattern?: string
  options?: any[]
  message: string
}
