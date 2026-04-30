import { Typography, Card, Empty } from 'antd'

const { Title } = Typography

export default function Tasks() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>任务管理</Title>
      <Card>
        <Empty description="任务管理功能开发中，敬请期待" />
      </Card>
    </div>
  )
}
