import { Button, Tag } from 'antd';
import { useState } from 'react';
import { useDesignerStore } from '@/services/designer/designerStore';
import type { FormFieldDefVO } from '@/types/designer';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SubformConfigDrawer } from './SubformConfigDrawer';

interface Props {
  field: FormFieldDefVO;     // type='subform' field
  isSelected: boolean;
  childFields?: FormFieldDefVO[];  // for preview
}

export function SubformContainer({ field, isSelected, childFields = [] }: Props) {
  const selectField = useDesignerStore((s) => s.selectField);
  const updateField = useDesignerStore((s) => s.updateField);

  const [configOpen, setConfigOpen] = useState(false);

  const config = (field.config ?? {}) as {
    subformRefId?: number;
    isList?: boolean;
    linkFields?: Array<{ parent: string; child: string }>;
    onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  };

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

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.3 : 1,
          marginBottom: 8,
          border: isSelected ? '2px solid #1677ff' : '2px dashed #1677ff',
          background: '#e6f7ff',
          borderRadius: 4,
          padding: 8,
        }}
        onClick={() => selectField(field.id)}
        {...attributes}
        {...listeners}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ cursor: 'grab' }}>⋮⋮</span>
          <span>📦</span>
          <b>{field.name || field.code}</b>
          <Tag color="blue">子表单</Tag>
          {config.isList !== undefined && (
            <Tag>{config.isList ? '1:N' : '1:1'}</Tag>
          )}
          <small style={{ color: '#888' }}>🔒 只读预览</small>
          <span style={{ flex: 1 }} />
          <Button size="small" onClick={(e) => { e.stopPropagation(); setConfigOpen(true); }}>
            ⚙ 配置
          </Button>
          <Button size="small" onClick={(e) => e.stopPropagation()}>
            ↗ 打开
          </Button>
        </header>

        {/* 只读预览子表单字段（不显示链接字段）*/}
        <div style={{ background: '#fff', margin: '6px 0 0', padding: 8, borderRadius: 3, fontSize: 12 }}>
          {childFields.length === 0 ? (
            <em style={{ color: '#999' }}>未配置子表单</em>
          ) : (
            childFields
              .filter((f) => !f.isLinkField)
              .map((f) => (
                <div key={f.id} style={{ padding: 2 }}>
                  • {f.name} <small style={{ color: '#888' }}>({f.type})</small>
                  {f.required && <Tag color="red" style={{ marginLeft: 4 }}>必填</Tag>}
                </div>
              ))
          )}
        </div>
      </div>

      <SubformConfigDrawer
        open={configOpen}
        field={field}
        onClose={() => setConfigOpen(false)}
        onSave={(cfg: any) => {
          updateField(field.id, { config: cfg, name: `子表单#${cfg.subformRefId}` });
          setConfigOpen(false);
        }}
      />
    </>
  );
}
