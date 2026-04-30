import { Typography, Card, Empty } from 'antd'

const { Title } = Typography

export default function Analytics() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>数据分析</Title>
      <Card>
        <Empty description="数据分析功能开发中，敬请期待" />
      </Card>
    </div>
  )
}
