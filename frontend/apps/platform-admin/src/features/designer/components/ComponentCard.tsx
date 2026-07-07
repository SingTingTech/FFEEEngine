import { Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';

interface Props {
  type: string;
  label: string;
  emoji: string;
  onAdd: () => void;
}

export function ComponentCard({ type, label, emoji, onAdd }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
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
        // Keep the card anchored in the library while dragging — the
        // DragOverlay renders the cursor-following preview instead. A
        // faint outline + dim opacity signals "this one's being dragged"
        // without the row collapsing or the card flying out of the sider.
        opacity: isDragging ? 0.35 : 1,
        outline: isDragging ? '2px dashed #1677ff' : 'none',
        outlineOffset: -2,
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
