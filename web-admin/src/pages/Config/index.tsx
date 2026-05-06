import { useState, useEffect } from 'react'
import { Card, Form, Switch, InputNumber, Input, Button, message, Typography, Divider, Spin, Table, Tag, Space, Modal, Select, Tabs, Checkbox, Alert } from 'antd'
import { SaveOutlined, UserOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { getConfig, updateConfig, getUserList, updateUserRole } from '@/services/config'
import type { AppConfig, UserRecord, UserRole, RoleFeatures, RoleLimits } from '@/types'

const { Title, Text } = Typography

const DEFAULT_FEATURES: RoleFeatures = {
  task_enabled: true,
  team_enabled: false,
  enterprise_enabled: false,
  notification_enabled: true,
  weekly_report_enabled: false,
  voice_input_enabled: false,
  config_access: false,
}

const DEFAULT_LIMITS: RoleLimits = {
  max_tasks_per_user: 50,
  max_subtasks_per_task: 10,
  max_team_members: 20,
}

const DEFAULT_CONFIG: AppConfig = {
  role_config: {
    member: { features: { ...DEFAULT_FEATURES, config_access: false }, limits: { ...DEFAULT_LIMITS } },
    admin: { features: { ...DEFAULT_FEATURES, config_access: true }, limits: { max_tasks_per_user: 200, max_subtasks_per_task: 30, max_team_members: 50 } },
    owner: { features: { ...DEFAULT_FEATURES, task_enabled: true, team_enabled: true, enterprise_enabled: true, notification_enabled: true, weekly_report_enabled: true, voice_input_enabled: true, config_access: true }, limits: { max_tasks_per_user: 999, max_subtasks_per_task: 100, max_team_members: 500 } },
  },
}

const ROLE_NAMES: Record<UserRole, string> = {
  member: '普通成员',
  admin: '管理员',
  owner: '所有者',
}

const ROLE_COLORS: Record<UserRole, string> = {
  member: 'blue',
  admin: 'orange',
  owner: 'gold',
}

export default function ConfigManagement() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<UserRecord[]>([])
  const [authorizedSubjects, setAuthorizedSubjects] = useState<Array<{ user: UserRecord; permissions: string[] }>>([])

  useEffect(() => {
    loadConfig()
    loadUsers()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const result = await getConfig()
      if (result.code === 200 && result.data) {
        const cfg = result.data as AppConfig
        if (!cfg.role_config) {
          setConfig(DEFAULT_CONFIG)
        } else {
          setConfig(cfg)
        }
      }
    } catch {
      message.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const result = await getUserList({ limit: 100 })
      if (result.code === 200) {
        const d = result.data as { list: UserRecord[]; total: number }
        const userList = d.list || []
        setAllUsers(userList)
        const admins = userList.filter(u => u.role === 'admin' || u.role === 'owner')
        setUsers(admins)
        setAuthorizedSubjects(admins.map(u => ({ user: u, permissions: ['config_access', 'user_manage'] })))
      }
    } catch {
      message.error('获取用户失败')
    } finally {
      setUsersLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateConfig(config)
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
        setSelectedPermissions([])
        loadUsers()
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
        loadUsers()
      } else {
        message.error(result.msg || '移除失败')
      }
    } catch {
      message.error('移除失败')
    }
  }

  const updateRoleFeatures = (role: UserRole, key: keyof RoleFeatures, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      role_config: {
        ...prev.role_config,
        [role]: {
          ...prev.role_config[role],
          features: { ...prev.role_config[role].features, [key]: value },
        },
      },
    }))
  }

  const updateRoleLimits = (role: UserRole, key: keyof RoleLimits, value: number) => {
    setConfig(prev => ({
      ...prev,
      role_config: {
        ...prev.role_config,
        [role]: {
          ...prev.role_config[role],
          limits: { ...prev.role_config[role].limits, [key]: value },
        },
      },
    }))
  }

  const renderRoleConfig = (role: UserRole) => {
    const roleData = config.role_config?.[role] || { features: DEFAULT_FEATURES, limits: DEFAULT_LIMITS }
    const features = roleData.features
    const limits = roleData.limits

    return (
      <div key={role}>
        <Card 
          title={
            <Space>
              <Tag color={ROLE_COLORS[role]}>{ROLE_NAMES[role]}</Tag>
              <Text type="secondary">功能权限与使用限制</Text>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>功能开关</Text>
              <Space wrap>
                <Checkbox 
                  checked={features.task_enabled} 
                  onChange={e => updateRoleFeatures(role, 'task_enabled', e.target.checked)}
                >
                  任务功能
                </Checkbox>
                <Checkbox 
                  checked={features.team_enabled} 
                  onChange={e => updateRoleFeatures(role, 'team_enabled', e.target.checked)}
                >
                  团队功能
                </Checkbox>
                <Checkbox 
                  checked={features.enterprise_enabled} 
                  onChange={e => updateRoleFeatures(role, 'enterprise_enabled', e.target.checked)}
                >
                  企业功能
                </Checkbox>
                <Checkbox 
                  checked={features.notification_enabled} 
                  onChange={e => updateRoleFeatures(role, 'notification_enabled', e.target.checked)}
                >
                  消息通知
                </Checkbox>
                <Checkbox 
                  checked={features.weekly_report_enabled} 
                  onChange={e => updateRoleFeatures(role, 'weekly_report_enabled', e.target.checked)}
                >
                  周报功能
                </Checkbox>
                <Checkbox 
                  checked={features.voice_input_enabled} 
                  onChange={e => updateRoleFeatures(role, 'voice_input_enabled', e.target.checked)}
                >
                  语音输入
                </Checkbox>
                <Checkbox 
                  checked={features.config_access} 
                  onChange={e => updateRoleFeatures(role, 'config_access', e.target.checked)}
                >
                  配置管理访问
                </Checkbox>
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>使用限制</Text>
              <Space wrap size="large">
                <div>
                  <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>每人最大任务数</Text>
                  <InputNumber 
                    min={1} 
                    max={999} 
                    value={limits.max_tasks_per_user}
                    onChange={v => v && updateRoleLimits(role, 'max_tasks_per_user', v)}
                    style={{ width: 80 }}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>每任务最大子任务数</Text>
                  <InputNumber 
                    min={1} 
                    max={100} 
                    value={limits.max_subtasks_per_task}
                    onChange={v => v && updateRoleLimits(role, 'max_subtasks_per_task', v)}
                    style={{ width: 80 }}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>团队最大人数</Text>
                  <InputNumber 
                    min={2} 
                    max={500} 
                    value={limits.max_team_members}
                    onChange={v => v && updateRoleLimits(role, 'max_team_members', v)}
                    style={{ width: 80 }}
                  />
                </div>
              </Space>
            </div>
          </Space>
        </Card>
      </div>
    )
  }

  const authorizedColumns = [
    { title: '用户', dataIndex: 'nickname', key: 'nickname', width: 150 },
    { 
      title: 'OpenID', 
      dataIndex: 'openid', 
      key: 'openid', 
      width: 120, 
      ellipsis: true,
      render: (openid: string) => openid?.slice(-8) || '-'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => {
        const r = role as UserRole
        return <Tag color={ROLE_COLORS[r] || 'default'}>{ROLE_NAMES[r] || role}</Tag>
      },
    },
    {
      title: '小程序端权限',
      key: 'permissions',
      width: 200,
      render: (_: unknown, record: UserRecord) => {
        const perms = record.role === 'owner' 
          ? ['全部权限'] 
          : record.role === 'admin' 
            ? ['配置管理', '用户管理'] 
            : []
        return perms.map(p => <Tag key={p} style={{ marginBottom: 4 }}>{p}</Tag>)
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
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
        <Card style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>按角色配置功能权限与使用限制</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              不同角色拥有不同的功能开关和使用限制
            </Text>
          </div>
          
          <Tabs
            items={[
              { key: 'member', label: <Tag color="blue">普通成员</Tag>, children: renderRoleConfig('member') },
              { key: 'admin', label: <Tag color="orange">管理员</Tag>, children: renderRoleConfig('admin') },
              { key: 'owner', label: <Tag color="gold">所有者</Tag>, children: renderRoleConfig('owner') },
            ]}
          />

          <Divider />

          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">
            保存配置
          </Button>
        </Card>

        <Divider />

        <Card title="企业微信配置" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="企业ID" help="在企业微信管理后台 -> 我的企业 -> 企业信息中查看">
              <Input placeholder="请输入企业ID" />
            </Form.Item>
            <Form.Item label="通讯录管理Secret" help="在企业微信管理后台 -> 管理工具 -> 通讯录同步中获取">
              <Input.Password placeholder="请输入通讯录管理Secret" />
            </Form.Item>
            <Form.Item label="应用AgentId" help="在企业微信管理后台 -> 应用管理中查看">
              <InputNumber placeholder="请输入应用AgentId" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="应用Secret" help="在企业微信管理后台 -> 应用管理中获取">
              <Input.Password placeholder="请输入应用Secret" />
            </Form.Item>
            <Alert 
              message="提示" 
              description="企业微信配置保存在后端，敏感信息（Secret）不会暴露给前端。配置完成后，小程序端可正常同步企业数据。"
              type="info" 
              showIcon 
              style={{ marginTop: 16 }} 
            />
          </Form>
        </Card>
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
          授权用户可在小程序端访问管理功能和配置管理页面。权限由角色配置控制。
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
        onCancel={() => { setAddModalOpen(false); setSelectedUserId(''); setSelectedPermissions([]) }}
        okText="添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
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
          <Checkbox.Group
            value={selectedPermissions}
            onChange={v => setSelectedPermissions(v as string[])}
            options={[
              { label: '配置管理访问', value: 'config_access' },
              { label: '用户管理', value: 'user_manage' },
            ]}
          />
        </Space>
      </Modal>
    </div>
  )
}
