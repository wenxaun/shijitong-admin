import { useState, useEffect } from 'react'
import { Card, Form, Switch, InputNumber, Button, message, Typography, Divider, Spin, Table, Tag, Space, Modal, Select } from 'antd'
import { SaveOutlined, UserOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { getConfig, updateConfig, getUserList, updateUserRole } from '@/services/config'
import type { AppConfig, UserRecord } from '@/types'

const { Title, Text } = Typography

export default function ConfigManagement() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [allUsers, setAllUsers] = useState<UserRecord[]>([])

  useEffect(() => {
    loadConfig()
    loadAuthorizedUsers()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const result = await getConfig()
      if (result.code === 200 && result.data) {
        form.setFieldsValue(result.data)
      }
    } catch {
      message.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const loadAuthorizedUsers = async () => {
    setUsersLoading(true)
    try {
      const result = await getUserList({ limit: 100 })
      if (result.code === 200) {
        const d = result.data as { list: UserRecord[]; total: number }
        const userList = d.list || []
        setAllUsers(userList)
        setUsers(userList.filter(u => u.role === 'admin' || u.role === 'owner'))
      }
    } catch {
      message.error('获取授权用户失败')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleSave = async (values: AppConfig) => {
    setSaving(true)
    try {
      const result = await updateConfig(values)
      if (result.code === 200) {
        message.success('配置已保存')
      } else {
        message.error(result.msg || '保存失败')
      }
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleAddAuthorizedUser = async () => {
    if (!selectedUserId) {
      message.error('请选择用户')
      return
    }
    
    try {
      const result = await updateUserRole(selectedUserId, 'admin')
      if (result.code === 200) {
        message.success('已添加授权')
        setAddModalOpen(false)
        setSelectedUserId('')
        loadAuthorizedUsers()
      } else {
        message.error(result.msg || '添加失败')
      }
    } catch {
      message.error('添加失败')
    }
  }

  const handleRemoveAuthorizedUser = async (userId: string, currentRole: string) => {
    if (currentRole === 'owner') {
      message.error('不能移除所有者权限')
      return
    }
    
    try {
      const result = await updateUserRole(userId, 'member')
      if (result.code === 200) {
        message.success('已移除授权')
        loadAuthorizedUsers()
      } else {
        message.error(result.msg || '移除失败')
      }
    } catch {
      message.error('移除失败')
    }
  }

  const authorizedColumns = [
    { title: '用户', dataIndex: 'nickname', key: 'nickname', width: 200 },
    { 
      title: 'OpenID', 
      dataIndex: 'openid', 
      key: 'openid', 
      width: 200, 
      ellipsis: true,
      render: (openid: string) => openid?.slice(-8) || '-'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const roleMap: Record<string, { color: string; text: string }> = {
          owner: { color: 'gold', text: '所有者' },
          admin: { color: 'red', text: '管理员' },
        }
        const r = roleMap[role] || { color: 'default', text: role }
        return <Tag color={r.color}>{r.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: UserRecord) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveAuthorizedUser(record._id, record.role || 'member')}
          disabled={record.role === 'owner'}
        >
          移除
        </Button>
      ),
    },
  ]

  const availableUsers = allUsers.filter(u => !['admin', 'owner'].includes(u.role || 'member'))

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>配置管理</Title>
      
      <Spin spinning={loading}>
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Card title="功能开关" style={{ marginBottom: 16 }}>
            <Form.Item name={['features', 'team_enabled']} valuePropName="checked" label="团队功能">
              <Switch />
            </Form.Item>
            <Form.Item name={['features', 'enterprise_enabled']} valuePropName="checked" label="企业功能">
              <Switch />
            </Form.Item>
            <Form.Item name={['features', 'notification_enabled']} valuePropName="checked" label="消息通知">
              <Switch />
            </Form.Item>
            <Form.Item name={['features', 'weekly_report_enabled']} valuePropName="checked" label="周报功能">
              <Switch />
            </Form.Item>
            <Form.Item name={['features', 'voice_input_enabled']} valuePropName="checked" label="语音输入">
              <Switch />
            </Form.Item>
          </Card>

          <Card title="使用限制" style={{ marginBottom: 16 }}>
            <Form.Item name={['limits', 'max_tasks_per_user']} label="每人最大任务数">
              <InputNumber min={1} max={1000} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name={['limits', 'max_subtasks_per_task']} label="每任务最大子任务数">
              <InputNumber min={1} max={100} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name={['limits', 'max_team_members']} label="团队最大人数">
              <InputNumber min={2} max={500} style={{ width: 200 }} />
            </Form.Item>
          </Card>

          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
            保存配置
          </Button>
        </Form>
      </Spin>

      <Divider />

      <Card 
        title={
          <Space>
            <UserOutlined />
            <span>授权主体</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            添加授权
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          授权用户可以访问小程序端的管理功能和配置管理页面
        </Text>
        <Table
          columns={authorizedColumns}
          dataSource={users}
          rowKey="_id"
          loading={usersLoading}
          pagination={false}
          size="small"
        />
      </Card>

      <Modal
        title="添加授权用户"
        open={addModalOpen}
        onOk={handleAddAuthorizedUser}
        onCancel={() => { setAddModalOpen(false); setSelectedUserId('') }}
        okText="添加"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="选择用户">
            <Select
              style={{ width: '100%' }}
              placeholder="请选择用户"
              value={selectedUserId || undefined}
              onChange={setSelectedUserId}
              showSearch
              filterOption={(input, option) => 
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={availableUsers.map(u => ({
                value: u._id,
                label: `${u.nickname || '未命名'} (${u.openid?.slice(-8)})`
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
