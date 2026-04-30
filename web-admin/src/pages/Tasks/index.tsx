import { useState, useEffect } from 'react'
import { Typography, Card, Table, Button, Space, message, Modal, Select, Descriptions, Alert, Tabs } from 'antd'
import { DeleteOutlined, BackupOutlined, UserOutlined } from '@ant-design/icons'
import { getUserList } from '@/services/config'
import { getUserRelatedData, backupUserTasks, deleteUserWithCascade } from '@/services/api'
import type { UserRecord } from '@/types'

const { Title } = Typography

interface RelatedData {
  tasks: any[]
  teams: any[]
  relatedUsers: any[]
  summary: { taskCount: number; teamCount: number; relatedUserCount: number }
}

export default function Tasks() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null)
  const [relatedDataLoading, setRelatedDataLoading] = useState(false)
  
  const [backupModalOpen, setBackupModalOpen] = useState(false)
  const [targetUserId, setTargetUserId] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const result = await getUserList({ limit: 100 })
      if (result.code === 200) {
        const d = result.data as { list: UserRecord[]; total: number }
        setUsers(d.list || [])
      }
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleSelectUser = async (userId: string) => {
    const user = users.find(u => u._id === userId)
    if (!user) return
    
    setSelectedUser(user)
    setRelatedDataLoading(true)
    setRelatedData(null)
    
    try {
      const result = await getUserRelatedData(userId)
      if (result.code === 200) {
        setRelatedData(result.data)
      }
    } catch {
      message.error('获取关联数据失败')
    } finally {
      setRelatedDataLoading(false)
    }
  }

  const handleBackup = async () => {
    if (!selectedUser || !targetUserId) {
      message.error('请选择目标用户')
      return
    }
    
    setBackupLoading(true)
    try {
      const result = await backupUserTasks(selectedUser._id, targetUserId)
      if (result.code === 200) {
        message.success(`备份成功，已备份 ${result.data?.backupCount || 0} 条任务`)
        setBackupModalOpen(false)
        setTargetUserId('')
        handleSelectUser(selectedUser._id)
      } else {
        message.error(result.msg || '备份失败')
      }
    } catch {
      message.error('操作失败')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!selectedUser) return
    
    setDeleteLoading(true)
    try {
      const result = await deleteUserWithCascade(selectedUser._id)
      if (result.code === 200) {
        message.success(`删除成功，已删除 ${result.data?.deletedTasks || 0} 条任务`)
        setDeleteModalOpen(false)
        setSelectedUser(null)
        setRelatedData(null)
        loadUsers()
      } else {
        message.error(result.msg || '删除失败')
      }
    } catch {
      message.error('操作失败')
    } finally {
      setDeleteLoading(false)
    }
  }

  const taskColumns = [
    { title: '任务名称', dataIndex: 'title', key: 'title', width: 200, ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  ]

  const teamColumns = [
    { title: '团队名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '成员数', dataIndex: 'members', key: 'members', width: 100, render: (m: any[]) => m?.length || 0 },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>任务管理</Title>
      
      <Card title="用户数据管理" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <span style={{ marginRight: 8 }}>选择用户：</span>
            <Select
              style={{ width: 300 }}
              placeholder="选择要管理的用户"
              loading={usersLoading}
              value={selectedUser?._id || undefined}
              onChange={handleSelectUser}
              options={users.map(u => ({
                value: u._id,
                label: `${u.nickname || '未命名'} (${u.openid?.slice(-8)})`
              }))}
            />
          </div>

          {selectedUser && (
            <>
              <Space style={{ marginTop: 16 }}>
                <Button 
                  icon={<BackupOutlined />} 
                  onClick={() => setBackupModalOpen(true)}
                  disabled={!relatedData || relatedData.summary.taskCount === 0}
                >
                  备份任务数据
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => setDeleteModalOpen(true)}
                >
                  删除用户所有数据
                </Button>
              </Space>

              {relatedDataLoading ? (
                <Card style={{ marginTop: 16 }}>加载中...</Card>
              ) : relatedData && (
                <Card style={{ marginTop: 16 }}>
                  <Descriptions title="数据统计" bordered size="small" column={3}>
                    <Descriptions.Item label="任务数量">{relatedData.summary.taskCount}</Descriptions.Item>
                    <Descriptions.Item label="团队数量">{relatedData.summary.teamCount}</Descriptions.Item>
                    <Descriptions.Item label="关联用户">{relatedData.summary.relatedUserCount}</Descriptions.Item>
                  </Descriptions>

                  <Tabs
                    style={{ marginTop: 16 }}
                    items={[
                      {
                        key: 'tasks',
                        label: `任务列表 (${relatedData.summary.taskCount})`,
                        children: (
                          <Table
                            columns={taskColumns}
                            dataSource={relatedData.tasks}
                            rowKey="_id"
                            size="small"
                            pagination={{ pageSize: 5 }}
                          />
                        )
                      },
                      {
                        key: 'teams',
                        label: `团队列表 (${relatedData.summary.teamCount})`,
                        children: (
                          <Table
                            columns={teamColumns}
                            dataSource={relatedData.teams}
                            rowKey="_id"
                            size="small"
                            pagination={{ pageSize: 5 }}
                          />
                        )
                      }
                    ]}
                  />
                </Card>
              )}
            </>
          )}
        </Space>
      </Card>

      <Modal
        title="备份用户任务"
        open={backupModalOpen}
        onOk={handleBackup}
        onCancel={() => { setBackupModalOpen(false); setTargetUserId('') }}
        okText="确认备份"
        okButtonProps={{ loading: backupLoading }}
        cancelText="取消"
      >
        <Alert
          message={`将 ${selectedUser?.nickname || selectedUser?.openid?.slice(-8)} 的任务备份到其他用户`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Select
          style={{ width: '100%' }}
          placeholder="选择目标用户"
          value={targetUserId || undefined}
          onChange={setTargetUserId}
          options={users
            .filter(u => u._id !== selectedUser?._id)
            .map(u => ({
              value: u._id,
              label: `${u.nickname || '未命名'} (${u.openid?.slice(-8)})`
            }))
          }
        />
      </Modal>

      <Modal
        title="删除用户所有数据"
        open={deleteModalOpen}
        onOk={handleDeleteAll}
        onCancel={() => setDeleteModalOpen(false)}
        okText="确认删除"
        okButtonProps={{ danger: true, loading: deleteLoading }}
        cancelText="取消"
      >
        <Alert
          message="危险操作"
          description={`将删除用户 ${selectedUser?.nickname || selectedUser?.openid?.slice(-8)} 的所有数据，包括任务、团队等。此操作不可恢复！`}
          type="error"
          showIcon
        />
        {relatedData && (
          <Descriptions style={{ marginTop: 16 }} bordered size="small" column={1}>
            <Descriptions.Item label="将删除任务">{relatedData.summary.taskCount} 条</Descriptions.Item>
            <Descriptions.Item label="将删除/更新团队">{relatedData.summary.teamCount} 个</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
