import { callCloudFunction } from './api'
import type { AppConfig, UserRecord, ApiResponse } from '@/types'

// 获取用户列表
export async function getUserList(params: {
  search?: string
  userType?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse> {
  return callCloudFunction('admin-users', {
    action: 'list',
    ...params,
  })
}

// 删除用户
export async function deleteUser(userId: string): Promise<ApiResponse> {
  return callCloudFunction('admin-users', {
    action: 'delete',
    userId,
  })
}

// 获取配置
export async function getConfig(): Promise<ApiResponse> {
  return callCloudFunction('admin-config', {
    action: 'get',
  })
}

// 更新配置
export async function updateConfig(config: Partial<AppConfig>): Promise<ApiResponse> {
  return callCloudFunction('admin-config', {
    action: 'update',
    config,
  })
}
