import { Link } from 'react-router-dom';
import { Card, Space, Typography } from 'antd';

export default function EmbeddableDemoIndex() {
  return (
    <Card title="嵌入组件 Demo">
      <Space direction="vertical">
        <Link to="/embdemo/list">→ FormList 演示（订单列表）</Link>
        <Link to="/embdemo/new">→ FormFiller 演示（新建订单）</Link>
        <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
          这些页面演示了 @safe-validator/form-embeddable 在真实应用中的用法。
        </Typography.Paragraph>
      </Space>
    </Card>
  );
}
