import { Dropdown, Tag, Button } from 'antd';
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useDesignerStore } from '@/services/designer/designerStore';
import type { SectionVO, FormFieldDefVO } from '@/types/designer';
import { CanvasField } from './CanvasField';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  section: SectionVO;
  fields: FormFieldDefVO[];
  selectedFieldId: string | null;
}

export function CanvasSection({ section, fields, selectedFieldId }: Props) {
  const removeSection = useDesignerStore((s) => s.removeSection);
  const updateSection = useDesignerStore((s) => s.updateSection);

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `canvas-section-${section.id}`,
    data: { source: 'canvas-section', sectionId: section.id },
  });

  return (
    <div
      ref={dropRef}
      style={{
        marginBottom: 8,
        border: `2px dashed ${isOver ? '#1677ff' : '#faad14'}`,
        background: isOver ? '#e6f4ff' : '#fffbe6',
        borderRadius: 4,
        padding: 6,
        transition: 'all 0.15s',
      }}
    >
      <header
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px' }}
        onClick={() => updateSection(section.id, {})}
      >
        <span>▾</span>
        <b>{section.name}</b>
        <Tag>分组</Tag>
        <span style={{ flex: 1 }} />
        <Dropdown
          menu={{
            items: [
              { key: 'rename', label: '重命名', onClick: () => {
                const name = prompt('分组名', section.name);
                if (name) updateSection(section.id, { name });
              }},
              { key: 'delete', icon: <DeleteOutlined />, label: '删除分组', danger: true, onClick: () => {
                if (confirm('删除分组（字段不会被删除，会移到画布根）?')) {
                  removeSection(section.id);
                }
              }},
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      </header>
      <div style={{ paddingLeft: 16 }}>
        {fields.map((f) => (
          <CanvasField key={f.id} field={f} isSelected={f.id === selectedFieldId} />
        ))}
      </div>
    </div>
  );
}