import { useState, useEffect } from 'react'
import { Table, Button, Input, Tag, Space, message, Popconfirm, Typography } from 'antd'
import { DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { getUserList, deleteUser } from '@/services/config'
import type { UserRecord } from '@/types'

const { Title } = Typography

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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

  const handleDelete = async (userId: string) => {
    try {
      const result = await deleteUser(userId)
      if (result.code === 200) {
        message.success('删除成功')
        loadUsers()
      } else {
        message.error(result.msg || '删除失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadUsers()
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
    { title: '角色', dataIndex: 'role', key: 'role', width: 100 },
    { title: '企业', dataIndex: 'corp_name', key: 'corp_name', width: 150 },
    { title: '注册时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, record: UserRecord) => (
        <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete(record._id)} okText="确定" cancelText="取消">
          <Button type="link" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
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
    </div>
  )
}
