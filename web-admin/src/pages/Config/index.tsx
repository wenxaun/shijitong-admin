import { useState, useEffect } from 'react'
import { Card, Form, Switch, InputNumber, Button, message, Typography, Divider, Spin } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { getConfig, updateConfig } from '@/services/config'
import type { AppConfig } from '@/types'

const { Title, Text } = Typography

export default function ConfigManagement() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadConfig()
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
    </div>
  )
}
