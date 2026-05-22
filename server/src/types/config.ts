export enum ConfigCategory {
  SYSTEM = 'system',
  FEATURE = 'feature',
  WECOM = 'wecom',
  TEXT = 'text',
  BUSINESS = 'business',
}

export interface AppConfig {
  system: any
  features: any
  wecom: any
  texts: any
  business: any
  _version: string
  _updatedAt: string
}

export interface ConfigRecord {
  id: string
  key: string
  value: any
  description: string
  category: ConfigCategory
  dataType: 'boolean' | 'number' | 'string' | 'object' | 'array'
  isPublic: boolean
  updatedAt: Date
  updatedBy: string
}

export interface ConfigVersion {
  id: string
  version: string
  configSnapshot: Record<string, any>
  changes: any[]
  createdAt: Date
  createdBy: string
  comment: string
}

export interface ConfigChange {
  key: string
  oldValue: any
  newValue: any
  type: 'added' | 'modified' | 'deleted'
  timestamp?: Date
  operator?: string
}
