# Part 4: Canvas + dnd-kit

**Phase:** 4 of 6
**Tasks:** 4.1 – 4.4
**End state:** Drag-to-insert from library works; drag-to-reorder within canvas works; CanvasField/CanvasSection/SubformContainer render properly.

**Working directory:** `/home/cris/dev/safeValidator/frontend/apps/platform-admin/`

Reference: design doc §6.4 for Canvas and §11.3 for dnd-kit setup.

---

## Task 4.1: dndHelpers

**Files:**
- Create: `src/services/designer/dndHelpers.ts`

- [ ] **Step 1: Create dndHelpers**

```typescript
import type { FormFieldDefVO, SectionVO } from '@/types/designer';

// Stable, sortable IDs for dnd-kit
export const libraryItemId = (type: string) => `library-${type}`;
export const canvasItemId = (fieldId: number) => `canvas-field-${fieldId}`;
export const canvasSectionId = (sectionId: number) => `canvas-section-${sectionId}`;

// Identify what's being dragged
export function isLibraryDrag(activeId: string): { type: string } | null {
  if (!activeId.startsWith('library-')) return null;
  return { type: activeId.slice('library-'.length) };
}

export function isCanvasDrag(activeId: string): number | null {
  const m = activeId.match(/^canvas-field-(-?\d+)$/);
  return m ? Number(m[1]) : null;
}

// Insertion index calculator
export function getInsertIndex(overId: string, fields: FormFieldDefVO[]): number {
  const m = overId.match(/^canvas-field-(-?\d+)$/);
  if (!m) return fields.length;   // dropped on empty area = end
  const overId_num = Number(m[1]);
  return fields.findIndex((f) => f.id === overId_num);
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add apps/platform-admin/src/services/designer/dndHelpers.ts
git commit -m "feat(designer): add dndHelpers for library/canvas drag identification"
```

---

## Task 4.2: CanvasField + CanvasSection + SubformContainer

**Files:**
- Create: `src/features/designer/components/CanvasField.tsx`
- Create: `src/features/designer/components/CanvasSection.tsx`
- Create: `src/features/designer/components/SubformContainer.tsx`
- Create: `src/features/designer/components/FieldTypeIcon.tsx`

- [ ] **Step 1: Create FieldTypeIcon**

```tsx
const ICON_MAP: Record<string, string> = {
  text: '📝', longtext: '📄', number: '🔢', boolean: '✓',
  date: '📅', datetime: '🕐', select: '☑️', multiselect: '🔲',
  file: '📁', reference: '🔗', section: '▢', subform: '📦',
};

export function FieldTypeIcon({ type }: { type: string }) {
  return <span style={{ fontSize: 16, marginRight: 6 }}>{ICON_MAP[type] ?? '❓'}</span>;
}
```

- [ ] **Step 2: Create CanvasField**

```tsx
import { Button, Card, Dropdown, Tag } from 'antd';
import { DeleteOutlined, CopyOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import { useDesignerStore } from '@/services/designer/designerStore';
import { FieldTypeIcon } from './FieldTypeIcon';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  field: FormFieldDefVO;
  isSelected: boolean;
}

export function CanvasField({ field, isSelected }: Props) {
  const selectField = useDesignerStore((s) => s.selectField);
  const updateField = useDesignerStore((s) => s.updateField);
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
        bodyStyle={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
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

import type { FormFieldDefVO } from '@/types/designer';
```

- [ ] **Step 3: Create CanvasSection**

```tsx
import { Card, Dropdown, Tag, Button } from 'antd';
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useDesignerStore } from '@/services/designer/designerStore';
import type { SectionVO, FormFieldDefVO } from '@/types/designer';
import { CanvasField } from './CanvasField';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  section: SectionVO;
  fields: FormFieldDefVO[];   // fields that belong to this section
  selectedFieldId: number | null;
}

export function CanvasSection({ section, fields, selectedFieldId }: Props) {
  const selectField = useDesignerStore((s) => s.selectField);
  const removeSection = useDesignerStore((s) => s.removeSection);
  const updateSection = useDesignerStore((s) => s.updateSection);

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `canvas-section-${section.id}`,
  });

  return (
    <div
      ref={dropRef}
      style={{
        marginBottom: 8,
        border: '2px dashed #faad14',
        background: '#fffbe6',
        borderRadius: 4,
        padding: 6,
        opacity: isOver ? 0.7 : 1,
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
```

- [ ] **Step 4: Create SubformContainer**

```tsx
import { Button, Tag } from 'antd';
import { useState } from 'react';
import { useDesignerStore } from '@/services/designer/designerStore';
import type { FormFieldDefVO } from '@/types/designer';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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
  const removeField = useDesignerStore((s) => s.removeField);

  const [configOpen, setConfigOpen] = useState(false);

  const config = (field.config ?? {}) as {
    subformRefId?: number;
    isList?: boolean;
    linkFields?: Array<{ parent: string; child: string }>;
    onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  };

  const { setNodeRef: dropRef } = useDroppable({
    id: `canvas-field-${field.id}`,
  });
  const { attributes, listeners, setNodeRef: dragRef, transform } = useDraggable({
    id: `canvas-field-${field.id}`,
    data: { source: 'canvas', fieldId: field.id },
  });

  return (
    <>
      <div
        ref={(el) => { dragRef(el); dropRef(el); }}
        style={{
          transform: CSS.Translate.toString(transform),
          marginBottom: 8,
          border: '2px dashed #1677ff',
          background: '#e6f7ff',
          borderRadius: 4,
          padding: 8,
        }}
        onClick={() => selectField(field.id)}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab' }}>⋮⋮</span>
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
        onSave={(cfg) => {
          updateField(field.id, { config: cfg, name: `子表单#${cfg.subformRefId}` });
          setConfigOpen(false);
        }}
      />
    </>
  );
}
```

- [ ] **Step 5: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components
git commit -m "feat(designer): add CanvasField, CanvasSection, SubformContainer"
```

---

## Task 4.3: Real Canvas with dnd-kit

**Files:**
- Modify: `src/features/designer/components/Canvas.tsx`

- [ ] **Step 1: Replace Canvas with real version**

```tsx
import { useMemo } from 'react';
import { Empty } from 'antd';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDesignerStore } from '@/services/designer/designerStore';
import { CanvasField } from './CanvasField';
import { CanvasSection } from './CanvasSection';
import { SubformContainer } from './SubformContainer';
import { libraryItemId, isLibraryDrag, isCanvasDrag, getInsertIndex } from '@/services/designer/dndHelpers';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { designerApi } from '@/services/designer/designerApi';
import { useParams } from 'react-router-dom';

export function Canvas() {
  const formId = useDesignerStore((s) => s.formId);
  const fields = useDesignerStore((s) => s.draftFields);
  const sections = useDesignerStore((s) => s.draftSections);
  const selectedFieldId = useDesignerStore((s) => s.selectedFieldId);
  const addField = useDesignerStore((s) => s.addField);
  const reorderFields = useDesignerStore((s) => s.reorderFields);
  const formName = useDesignerStore((s) => s.formName);

  const [draggingType, setDraggingType] = useState<string | null>(null);

  // For subform preview, need to fetch child schema
  const subformRefIds = useMemo(() =>
    fields.filter((f) => f.type === 'subform' && f.config?.subformRefId).map((f) => f.config!.subformRefId as number),
    [fields]
  );

  const { data: childSchemas } = useQuery({
    queryKey: ['subform-schemas', subformRefIds],
    queryFn: async () => {
      const results = await Promise.all(subformRefIds.map((id) => designerApi.getForm(id)));
      return results;
    },
    enabled: subformRefIds.length > 0,
  });

  const getChildFields = (subformRefId: number) => {
    return childSchemas?.find((s: any) => s.formId === subformRefId)?.fields ?? [];
  };

  // Group fields: section fields go inside section; non-section fields go at root
  const { rootFields, sectionFieldMap } = useMemo(() => {
    const map: Record<number, typeof fields> = {};
    const root: typeof fields = [];
    for (const f of fields) {
      if (f.sectionId) {
        if (!map[f.sectionId]) map[f.sectionId] = [];
        map[f.sectionId].push(f);
      } else {
        root.push(f);
      }
    }
    return { rootFields: root, sectionFieldMap: map };
  }, [fields]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: any) => {
    const lib = isLibraryDrag(event.active.id);
    if (lib) setDraggingType(lib.type);
  };

  const handleDragEnd = (event: any) => {
    setDraggingType(null);
    const { active, over } = event;
    if (!over) return;

    const lib = isLibraryDrag(active.id);
    if (lib) {
      // Add new field from library
      const insertIndex = getInsertIndex(over.id, fields);
      addField(lib.type, insertIndex === fields.length ? undefined : insertIndex);
      return;
    }

    // Reorder within canvas
    const fromId = isCanvasDrag(active.id);
    const toId = isCanvasDrag(over.id);
    if (fromId !== null && toId !== null && fromId !== toId) {
      const ids = fields.map((f) => f.id);
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(toId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const newOrder = [...ids];
        const [removed] = newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, removed);
        reorderFields(newOrder);
      }
    }
  };

  if (fields.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Empty description="从左侧组件库拖拽或点击 [+]" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
        <SortableContext items={fields.map((f) => `canvas-field-${f.id}`)} strategy={verticalListSortingStrategy}>
          {/* Render sections first, then non-section root fields */}
          {sections.map((sec) => (
            <CanvasSection
              key={sec.id}
              section={sec}
              fields={sectionFieldMap[sec.id] ?? []}
              selectedFieldId={selectedFieldId}
            />
          ))}
          {rootFields.map((f) =>
            f.type === 'subform' ? (
              <SubformContainer
                key={f.id}
                field={f}
                isSelected={f.id === selectedFieldId}
                childFields={getChildFields((f.config?.subformRefId as number) ?? 0)}
              />
            ) : (
              <CanvasField key={f.id} field={f} isSelected={f.id === selectedFieldId} />
            )
          )}
        </SortableContext>
      </div>
      <DragOverlay>
        {draggingType && (
          <div style={{ background: '#fff', padding: 8, border: '2px solid #1677ff', borderRadius: 4 }}>
            + {draggingType}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 2: Create SubformConfigDrawer stub (Phase 5 will fill in)**

```tsx
import { Drawer } from 'antd';
import type { FormFieldDefVO } from '@/types/designer';

interface Props {
  open: boolean;
  field: FormFieldDefVO;
  onClose: () => void;
  onSave: (config: any) => void;
}

// Stub — Phase 5 implements the full config UI
export function SubformConfigDrawer({ open, onClose }: Props) {
  return (
    <Drawer title="子表单配置（Phase 5 实现）" open={open} onClose={onClose} width={720}>
      <p>Phase 5 将在此实现完整的子表单配置：目标表单、是否为列表、链接字段映射（多对）、on_delete。</p>
    </Drawer>
  );
}
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components/Canvas.tsx apps/platform-admin/src/features/designer/components/SubformConfigDrawer.tsx
git commit -m "feat(designer): add real Canvas with dnd-kit drag/insert/reorder"
```

---

## Task 4.4: Phase 4 verification

- [ ] **Step 1: Dev server smoke test**

```bash
cd /home/cris/dev/safeValidator/frontend
nohup pnpm dev > /tmp/sv-dev.log 2>&1 &
sleep 8
curl -s -o /dev/null -w "dev: %{http_code}\n" http://localhost:5173
pkill -f vite
```

Expected: 200.

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add -A
git commit -m "chore: phase 4 (canvas + dnd-kit) verified" --allow-empty
```

**Phase 4 complete.** Proceed to [Part 5: Property Panel + Subform Config](2026-06-26-form-designer-part5-property-subform.md).
