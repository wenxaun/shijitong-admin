import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Typography, Spin } from 'antd'
import { TeamOutlined, UserOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { callCloudFunction } from '@/services/api'

const { Title } = Typography

interface DashboardData {
  totalUsers: number
  enterpriseUsers: number
  personalUsers: number
  totalTasks: number
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>({
    totalUsers: 0, enterpriseUsers: 0, personalUsers: 0, totalTasks: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const result = await callCloudFunction('admin-users', { action: 'list', limit: 1, offset: 0 })
      if (result.code === 200) {
        const d = result.data as { total: number }
        setData(prev => ({ ...prev, totalUsers: d.total }))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>仪表盘</Title>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic title="总用户数" value={data.totalUsers} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="企业用户" value={data.enterpriseUsers} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="个人用户" value={data.personalUsers} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="任务总数" value={data.totalTasks} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
