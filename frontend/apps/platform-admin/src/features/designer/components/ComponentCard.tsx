import { Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  type: string;
  label: string;
  emoji: string;
  onAdd: () => void;
}

export function ComponentCard({ type, label, emoji, onAdd }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `library-${type}`,
    data: { source: 'library', type },
  });

  return (
    <Card
      size="small"
      hoverable
      ref={setNodeRef}
      style={{
        marginBottom: 6,
        cursor: 'grab',
        transform: CSS.Translate.toString(transform),
      }}
      styles={{ body: { padding: 8, display: 'flex', alignItems: 'center', gap: 8 } }}
      data-component-type={type}
      {...attributes}
      {...listeners}
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
