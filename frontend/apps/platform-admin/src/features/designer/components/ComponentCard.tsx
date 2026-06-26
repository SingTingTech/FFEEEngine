import { Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface Props {
  type: string;
  label: string;
  emoji: string;
  onAdd: () => void;
}

export function ComponentCard({ type, label, emoji, onAdd }: Props) {
  return (
    <Card
      size="small"
      hoverable
      style={{ marginBottom: 6, cursor: 'grab' }}
      bodyStyle={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}
      data-component-type={type}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      <Button
        type="text"
        size="small"
        icon={<PlusOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
      />
    </Card>
  );
}
