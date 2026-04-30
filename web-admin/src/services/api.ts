const API_BASE_URL = ''

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

export async function getStats() {
  const res = await fetch(`${API_BASE_URL}/api/admin/stats`)
  return res.json()
}

export async function getUsers(params?: { search?: string; userType?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.userType) query.set('userType', params.userType)
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.offset) query.set('offset', String(params.offset))
  
  const res = await fetch(`${API_BASE_URL}/api/admin/users?${query}`)
  return res.json()
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function updateUserRole(userId: string, role: string) {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  return res.json()
}

export async function getAnalytics(startDate: string, endDate: string) {
  const res = await fetch(`${API_BASE_URL}/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`)
  return res.json()
}

export async function getSystemStatus() {
  const res = await fetch(`${API_BASE_URL}/api/admin/system/status`)
  return res.json()
}

export async function getSystemLogs(params?: { level?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.level) query.set('level', params.level)
  if (params?.limit) query.set('limit', String(params.limit))
  
  const res = await fetch(`${API_BASE_URL}/api/admin/system/logs?${query}`)
  return res.json()
}

export async function getConfig() {
  const res = await fetch(`${API_BASE_URL}/api/admin/config`)
  return res.json()
}

export async function updateConfig(config: any) {
  const res = await fetch(`${API_BASE_URL}/api/admin/config/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return res.json()
}

export async function syncConfigToCloud() {
  const res = await fetch(`${API_BASE_URL}/api/admin/config/sync-to-cloud`, { method: 'POST' })
  return res.json()
}

export const adminLogin = login

export async function callCloudFunction(name: string, data?: any) {
  const res = await fetch(`${API_BASE_URL}/api/admin/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  })
  return res.json()
}
