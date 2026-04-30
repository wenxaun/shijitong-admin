import { Typography, Card, Empty } from 'antd'

const { Title } = Typography

export default function System() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>系统监控</Title>
      <Card>
        <Empty description="系统监控功能开发中，敬请期待" />
      </Card>
    </div>
  )
}
