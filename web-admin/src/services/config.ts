import { getUsers, deleteUser as apiDeleteUser, getConfig as apiGetConfig, updateConfig as apiUpdateConfig, updateUserRole as apiUpdateUserRole } from './api'
import type { AppConfig, UserRecord, ApiResponse } from '@/types'

export async function getUserList(params: {
  search?: string
  userType?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse> {
  return getUsers(params)
}

export async function deleteUser(userId: string): Promise<ApiResponse> {
  return apiDeleteUser(userId)
}

export async function updateUserRole(userId: string, role: string): Promise<ApiResponse> {
  return apiUpdateUserRole(userId, role)
}

export async function getConfig(): Promise<ApiResponse> {
  return apiGetConfig()
}

export async function updateConfig(config: Partial<AppConfig>): Promise<ApiResponse> {
  return apiUpdateConfig(config)
}
