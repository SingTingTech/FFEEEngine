import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDesignerStore } from '@/services/designer/designerStore';
import { CanvasField } from './CanvasField';
import { CanvasSection } from './CanvasSection';
import { SubformContainer } from './SubformContainer';
import { EmptyCanvasDropZone } from './EmptyCanvasDropZone';
import { isLibraryDrag, isCanvasDrag } from '@/services/designer/dndHelpers';
import { buildRenderList } from '@/features/designer/renderList';
import { useQuery } from '@tanstack/react-query';
import { designerApi } from '@/services/designer/designerApi';
import type { SchemaDetailVO } from '@/types/designer';

export function Canvas() {
  const fields = useDesignerStore((s) => s.draftFields);
  const sections = useDesignerStore((s) => s.draftSections);
  const selectedFieldId = useDesignerStore((s) => s.selectedFieldId);
  const addFieldAt = useDesignerStore((s) => s.addFieldAt);
  const moveField = useDesignerStore((s) => s.moveField);

  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);

  // For subform preview
  const subformRefIds = useMemo(
    () => fields.filter((f) => f.type === 'subform' && f.config?.subformRefId)
                .map((f) => f.config!.subformRefId as string),
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
  const getChildFields = (subformRefId: string) =>
    childSchemas?.find((s: SchemaDetailVO | undefined) => s?.formId === subformRefId)?.fields ?? [];

  // Sortable items: 字段 id（sortable 关心 field，不关心 section）
  const sortableItems = fields.map((f) => `canvas-field-${f.id}`);

  const renderList = useMemo(() => buildRenderList(fields, sections), [fields, sections]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const lib = isLibraryDrag(String(event.active.id));
    if (lib) setDraggingType(lib.type);
    const canvasFieldId = isCanvasDrag(String(event.active.id));
    if (canvasFieldId !== null) setDraggingFieldId(canvasFieldId);
  };

  const handleDragCancel = () => {
    setDraggingType(null);
    setDraggingFieldId(null);
  };

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    setDraggingType(null);
    setDraggingFieldId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const activeId = String(active.id);

    // 库 → 画布
    const lib = isLibraryDrag(activeId);
    if (lib) {
      // 1. over 是字段
      const overField = isCanvasDrag(overId);
      if (overField !== null) {
        const overIdx = fields.findIndex((f) => f.id === overField);
        if (overIdx === -1) return;
        const overFieldObj = fields[overIdx];
        // 用 cursor 位置：这里简化为 'after'（落到 over 字段之后）
        // 真要 cursor-based 判定需要 onDragOver 跟踪位置，由 v1.2 实现
        addFieldAt(lib.type, overFieldObj.sectionId, overIdx + 1);
        return;
      }
      // 2. over 是分组
      if (overId.startsWith('canvas-section-')) {
        const sectionId = overId.replace('canvas-section-', '');
        const lastSectionIdx = lastIndexOfSection(fields, sectionId);
        addFieldAt(lib.type, sectionId, lastSectionIdx + 1);
        return;
      }
      // 3. over 是画布空白
      if (overId === 'canvas-empty') {
        addFieldAt(lib.type, null, fields.length);
        return;
      }
      return;
    }

    // 画布 → 画布
    const fromId = isCanvasDrag(activeId);
    if (fromId === null) return;
    const toId = isCanvasDrag(overId);
    if (toId !== null) {
      if (fromId === toId) return; // no-op
      const fromIdx = fields.findIndex((f) => f.id === fromId);
      const toIdx = fields.findIndex((f) => f.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      const target = fields[toIdx];
      moveField(fromId, target.sectionId, toIdx + (fromIdx < toIdx ? 1 : 0));
      return;
    }
    if (overId.startsWith('canvas-section-')) {
      const sectionId = overId.replace('canvas-section-', '');
      const lastSectionIdx = lastIndexOfSection(fields, sectionId);
      moveField(fromId, sectionId, lastSectionIdx + 1);
      return;
    }
    if (overId === 'canvas-empty') {
      moveField(fromId, null, fields.length);
      return;
    }
  };

  const isEmpty = fields.length === 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', minHeight: '100%' }}>
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {renderList.map((item) => {
            if (item.kind === 'section') {
              return (
                <CanvasSection
                  key={`section-${item.section.id}-${item.fields[0]?.id ?? 'empty'}`}
                  section={item.section}
                  fields={item.fields}
                  selectedFieldId={selectedFieldId}
                />
              );
            }
            const f = item.field;
            if (f.type === 'subform') {
              return (
                <SubformContainer
                  key={f.id}
                  field={f}
                  isSelected={f.id === selectedFieldId}
                  childFields={getChildFields((f.config?.subformRefId as string) ?? '')}
                />
              );
            }
            return <CanvasField key={f.id} field={f} isSelected={f.id === selectedFieldId} />;
          })}
        </SortableContext>
        <EmptyCanvasDropZone empty={isEmpty} />
      </div>
      <DragOverlay>
        {draggingType && (
          <div style={{
            background: '#fff', padding: '6px 12px',
            border: '2px solid #1677ff', borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            opacity: 0.9,
          }}>
            + {draggingType}
          </div>
        )}
        {draggingFieldId && (() => {
          const field = fields.find((f) => f.id === draggingFieldId);
          if (!field) return null;
          return (
            <div style={{
              background: '#fff', padding: '6px 12px',
              border: '2px solid #1677ff', borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: 0.9,
            }}>
              {field.name || field.code} <small style={{ color: '#888' }}>({field.type})</small>
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}

// 工具：找到最后一个 sectionId === sectionId 的字段索引
function lastIndexOfSection(fields: { sectionId: string | null }[], sectionId: string): number {
  for (let i = fields.length - 1; i >= 0; i--) {
    if (fields[i].sectionId === sectionId) return i;
  }
  return -1;
}