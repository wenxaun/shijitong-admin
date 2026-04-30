import { useState, useEffect } from 'react'
import { Table, Button, Input, Tag, Space, message, Typography, Select, Modal, Form, Descriptions, Alert, Transfer } from 'antd'
import { DeleteOutlined, SearchOutlined, ReloadOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { getUserList, updateUserRole } from '@/services/config'
import { getUserRelatedData, backupUserTasks, deleteUserWithCascade } from '@/services/api'
import type { UserRecord } from '@/types'

const { Title } = Typography

interface RelatedData {
  tasks: any[]
  teams: any[]
  relatedUsers: any[]
  summary: { taskCount: number; teamCount: number; relatedUserCount: number }
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [form] = Form.useForm()
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null)
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null)
  const [relatedDataLoading, setRelatedDataLoading] = useState(false)
  const [backupUserId, setBackupUserId] = useState<string>('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [page])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const result = await getUserList({ search, limit: 10, offset: (page - 1) * 10 })
      if (result.code === 200) {
        const d = result.data as { list: UserRecord[]; total: number }
        setUsers(d.list || [])
        setTotal(d.total || 0)
      }
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = async (user: UserRecord) => {
    setDeletingUser(user)
    setRelatedDataLoading(true)
    setDeleteModalOpen(true)
    setBackupUserId('')
    
    try {
      const result = await getUserRelatedData(user._id)
      if (result.code === 200) {
        setRelatedData(result.data)
      }
    } catch {
      message.error('获取关联数据失败')
    } finally {
      setRelatedDataLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return
    
    setDeleteLoading(true)
    try {
      const result = await deleteUserWithCascade(deletingUser._id, backupUserId || undefined)
      if (result.code === 200) {
        message.success(`删除成功，已删除 ${result.data?.deletedTasks || 0} 条任务`)
        setDeleteModalOpen(false)
        setDeletingUser(null)
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

  const handleSearch = () => {
    setPage(1)
    loadUsers()
  }

  const handleEditRole = (user: UserRecord) => {
    setEditingUser(user)
    form.setFieldsValue({ role: user.role || 'member' })
    setEditModalOpen(true)
  }

  const handleSaveRole = async () => {
    if (!editingUser) return
    
    try {
      const values = await form.validateFields()
      const result = await updateUserRole(editingUser._id, values.role)
      
      if (result.code === 200) {
        message.success('角色更新成功')
        setEditModalOpen(false)
        setEditingUser(null)
        loadUsers()
      } else {
        message.error(result.msg || '更新失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const columns = [
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 150 },
    { title: 'OpenID', dataIndex: 'openid', key: 'openid', width: 200, ellipsis: true },
    {
      title: '类型', dataIndex: 'user_type', key: 'user_type', width: 100,
      render: (type: string) => (
        <Tag color={type === 'enterprise' ? 'blue' : 'green'}>
          {type === 'enterprise' ? '企业' : '个人'}
        </Tag>
      ),
    },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 100,
      render: (role: string) => {
        const roleMap: Record<string, { color: string; text: string }> = {
          owner: { color: 'gold', text: '所有者' },
          admin: { color: 'red', text: '管理员' },
          member: { color: 'default', text: '成员' },
        }
        const r = roleMap[role || 'member'] || roleMap.member
        return <Tag color={r.color}>{r.text}</Tag>
      },
    },
    { title: '企业', dataIndex: 'corp_name', key: 'corp_name', width: 150 },
    { title: '注册时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, record: UserRecord) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => handleEditRole(record)}>
            角色
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDeleteClick(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>用户管理</Title>
      <Space style={{ marginBottom: 16 }}>
        <Input placeholder="搜索用户名" value={search} onChange={e => setSearch(e.target.value)} onPressEnter={handleSearch} style={{ width: 250 }} prefix={<SearchOutlined />} />
        <Button type="primary" onClick={handleSearch}>搜索</Button>
        <Button icon={<ReloadOutlined />} onClick={loadUsers}>刷新</Button>
      </Space>
      <Table
        columns={columns} dataSource={users} rowKey="_id" loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
      />
      
      <Modal
        title="修改用户角色"
        open={editModalOpen}
        onOk={handleSaveRole}
        onCancel={() => { setEditModalOpen(false); setEditingUser(null) }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="用户" name="username">
            <span>{editingUser?.nickname || editingUser?.openid?.slice(-8)}</span>
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
            <Select>
              <Select.Option value="member">成员</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="owner">所有者</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>删除用户确认</span>
          </Space>
        }
        open={deleteModalOpen}
        onOk={handleDeleteConfirm}
        onCancel={() => { setDeleteModalOpen(false); setDeletingUser(null); setRelatedData(null) }}
        okText="确认删除"
        okButtonProps={{ danger: true, loading: deleteLoading }}
        cancelText="取消"
        width={700}
      >
        {relatedDataLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>加载关联数据中...</div>
        ) : (
          <>
            <Alert
              message={`即将删除用户: ${deletingUser?.nickname || deletingUser?.openid?.slice(-8)}`}
              description="删除用户将同时删除其所有关联数据（任务、团队等），此操作不可恢复。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {relatedData && (
              <>
                <Descriptions title="关联数据统计" bordered size="small" column={3} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="任务数量">{relatedData.summary.taskCount}</Descriptions.Item>
                  <Descriptions.Item label="团队数量">{relatedData.summary.teamCount}</Descriptions.Item>
                  <Descriptions.Item label="关联用户">{relatedData.summary.relatedUserCount}</Descriptions.Item>
                </Descriptions>

                {relatedData.summary.taskCount > 0 && (
                  <>
                    <Alert
                      message="备份选项"
                      description="可以将该用户的任务备份到其他用户账号下，避免数据丢失。"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    
                    <Form.Item label="备份到用户（可选）">
                      <Select
                        style={{ width: '100%' }}
                        placeholder="选择备份目标用户"
                        allowClear
                        value={backupUserId || undefined}
                        onChange={setBackupUserId}
                        options={relatedData.relatedUsers.map((u: any) => ({
                          value: u._id,
                          label: `${u.nickname || '未命名'} (${u.openid?.slice(-8)})`
                        }))}
                      />
                    </Form.Item>
                  </>
                )}

                {relatedData.relatedUsers.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Title level={5}>受影响的关联用户</Title>
                    <div style={{ maxHeight: 150, overflow: 'auto' }}>
                      {relatedData.relatedUsers.map((u: any) => (
                        <Tag key={u._id} style={{ margin: 4 }}>
                          {u.nickname || u.openid?.slice(-8)}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
