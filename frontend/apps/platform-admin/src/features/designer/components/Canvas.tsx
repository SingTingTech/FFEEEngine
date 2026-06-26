import { useMemo, useState } from 'react';
import { Empty } from 'antd';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDesignerStore } from '@/services/designer/designerStore';
import { CanvasField } from './CanvasField';
import { CanvasSection } from './CanvasSection';
import { SubformContainer } from './SubformContainer';
import { isLibraryDrag, isCanvasDrag, getInsertIndex } from '@/services/designer/dndHelpers';
import { useQuery } from '@tanstack/react-query';
import { designerApi } from '@/services/designer/designerApi';
import type { SchemaDetailVO } from '@/types/designer';

export function Canvas() {
  const fields = useDesignerStore((s) => s.draftFields);
  const sections = useDesignerStore((s) => s.draftSections);
  const selectedFieldId = useDesignerStore((s) => s.selectedFieldId);
  const addField = useDesignerStore((s) => s.addField);
  const reorderFields = useDesignerStore((s) => s.reorderFields);

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
    return childSchemas?.find((s: SchemaDetailVO | undefined) => s?.formId === subformRefId)?.fields ?? [];
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

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const lib = isLibraryDrag(String(event.active.id));
    if (lib) setDraggingType(lib.type);
  };

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    setDraggingType(null);
    const { active, over } = event;
    if (!over) return;

    const lib = isLibraryDrag(String(active.id));
    if (lib) {
      // Add new field from library
      const insertIndex = getInsertIndex(String(over.id), fields);
      addField(lib.type, insertIndex === fields.length ? undefined : insertIndex);
      return;
    }

    // Reorder within canvas
    const fromId = isCanvasDrag(String(active.id));
    const toId = isCanvasDrag(String(over.id));
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
