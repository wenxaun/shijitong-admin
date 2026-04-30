import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Typography, Spin } from 'antd'
import { TeamOutlined, UserOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { getStats } from '@/services/api'

const { Title } = Typography

interface DashboardData {
  totalUsers: number
  activeUsers: number
  totalTasks: number
  completedTasks: number
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>({
    totalUsers: 0, activeUsers: 0, totalTasks: 0, completedTasks: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const result = await getStats()
      if (result.code === 200) {
        setData(result.data)
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
              <Statistic title="活跃用户" value={data.activeUsers} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="任务总数" value={data.totalTasks} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已完成" value={data.completedTasks} prefix={<SettingOutlined />} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
