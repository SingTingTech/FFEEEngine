import { Button, Card, Dropdown, Tag } from 'antd';
import { DeleteOutlined, CopyOutlined, MoreOutlined } from '@ant-design/icons';
import { useDesignerStore } from '@/services/designer/designerStore';
import { FieldTypeIcon } from './FieldTypeIcon';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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

  const { attributes, listeners, setNodeRef: dragRef, transform } = useDraggable({
    id: `canvas-field-${field.id}`,
    data: { source: 'canvas', fieldId: field.id },
  });
  const { setNodeRef: dropRef } = useDroppable({
    id: `canvas-field-${field.id}`,
  });

  return (
    <div ref={(el) => { dragRef(el); dropRef(el); }} style={{ transform: CSS.Translate.toString(transform), marginBottom: 6 }}>
      <Card
        size="small"
        hoverable
        style={{
          borderColor: isSelected ? '#1677ff' : undefined,
          background: isSelected ? '#e6f4ff' : '#fff',
        }}
        styles={{ body: { padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 } }}
        onClick={() => selectField(field.id)}
      >
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#888', fontSize: 18 }}
        >
          ⋮⋮
        </span>
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
                addField(field.type); // adds at end; for proper duplicate, would copy all props
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
