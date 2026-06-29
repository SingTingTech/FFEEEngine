import { Button, Card, Dropdown, Tag } from 'antd';
import { DeleteOutlined, CopyOutlined, MoreOutlined } from '@ant-design/icons';
import { useDesignerStore } from '@/services/designer/designerStore';
import { FieldTypeIcon } from './FieldTypeIcon';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormFieldDefVO } from '@/types/designer';

interface Props {
  field: FormFieldDefVO;
  isSelected: boolean;
}

export function CanvasField({ field, isSelected }: Props) {
  const selectField = useDesignerStore((s) => s.selectField);
  const removeField = useDesignerStore((s) => s.removeField);
  const addField = useDesignerStore((s) => s.addField);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `canvas-field-${field.id}`,
    data: { source: 'canvas', fieldId: field.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 6,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        size="small"
        hoverable
        style={{
          borderColor: isSelected ? '#1677ff' : undefined,
          background: isSelected ? '#e6f4ff' : '#fff',
          cursor: 'grab',
        }}
        styles={{ body: { padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 } }}
        onClick={() => selectField(field.id)}
      >
        <FieldTypeIcon type={field.type} />
        <span style={{ flex: 1, fontWeight: field.required ? 600 : 400 }}>{field.name || field.code}</span>
        <Tag>{field.type}</Tag>
        {field.required && <Tag color="red">必填</Tag>}
        {field.isLinkField && <Tag color="purple">链接字段</Tag>}
        {field.targetColumn && <Tag color="cyan">→ {field.targetColumn}</Tag>}
        <Dropdown
          menu={{
            items: [
              { key: 'duplicate', icon: <CopyOutlined />, label: '复制', onClick: () => {
                addField(field.type);
              }},
              { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => {
                removeField(field.id);
              }},
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      </Card>
    </div>
  );
}