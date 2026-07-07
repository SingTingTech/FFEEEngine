import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { App, Layout, Spin } from 'antd';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { designerApi } from '@/services/designer/designerApi';
import { useDesignerStore } from '@/services/designer/designerStore';
import { isLibraryDrag, isCanvasDrag } from '@/services/designer/dndHelpers';
import { TopBar } from '@/features/designer/components/TopBar';
import { ComponentLibrary } from '@/features/designer/components/ComponentLibrary';
import { Canvas } from '@/features/designer/components/Canvas';
import { PropertyPanel } from '@/features/designer/components/PropertyPanel';
import { FieldPreview } from '@/features/designer/components/FieldPreview';
import { LIBRARY_TYPE_META } from '@/features/designer/libraryMeta';

const { Content, Sider } = Layout;

export default function DesignerPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const loadSchema = useDesignerStore((s) => s.loadSchema);
  const reset = useDesignerStore((s) => s.reset);
  const fields = useDesignerStore((s) => s.draftFields);
  const addFieldAt = useDesignerStore((s) => s.addFieldAt);
  const moveField = useDesignerStore((s) => s.moveField);
  const removeField = useDesignerStore((s) => s.removeField);

  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  // Cursor-based insertion target for library→canvas and canvas→canvas
  // drags. Tracks which field the cursor is over and whether it's in the
  // top or bottom half (before/after). Canvas renders the InsertionLine
  // here.
  const [insertionTarget, setInsertionTarget] = useState<
    { fieldId: string; position: 'before' | 'after' } | null
  >(null);
  // True when the cursor is over the empty zone at the bottom of the
  // canvas (not over any field). Used to show the ghost card at the end.
  const [draggingOverEmpty, setDraggingOverEmpty] = useState(false);
  // True when the cursor is outside any valid drop target — e.g. dragged
  // off the canvas, over the app header/sidebar. handleDragEnd returns
  // early in this case, so we surface it visually (DragOverlay turns
  // red + ghost hides) to make the cancellation obvious.
  const [draggingInvalid, setDraggingInvalid] = useState(false);
  // Ref to the canvas Content sider so we can compute the cursor-vs-
  // canvas boundary ourselves. closestCorners can pick a droppable
  // even when the cursor is outside the canvas (its corner is closest
  // to a field), so we can't rely on `over` alone.
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!formId) {
      navigate('/designer');
      return;
    }
    reset();
  }, [formId, reset, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => designerApi.getForm(formId!),
    enabled: !!formId,
  });

  useEffect(() => {
    if (data) {
      loadSchema({
        formId: data.formId,
        schemaId: data.schemaId,
        formName: data.name,
        targetTable: data.targetTable,
        version: data.version,
        isCurrent: data.isCurrent ?? false,
        fields: data.fields,
        sections: data.sections,
        relationships: data.relationships,
      });
    }
  }, [data, loadSchema]);

  useEffect(() => {
    if (error) {
      message.error('加载失败');
      navigate('/designer');
    }
  }, [error, message, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const lib = isLibraryDrag(String(event.active.id));
    if (lib) setDraggingType(lib.type);
    const canvasFieldId = isCanvasDrag(String(event.active.id));
    if (canvasFieldId !== null) setDraggingFieldId(canvasFieldId);
  };

  // Update insertion preview on every mouse move. onDragOver only fires when
  // `over` changes (i.e. the cursor crosses a field boundary), so it can't
  // capture cursor movement within a single field — onDragMove is needed for
  // continuous before/after feedback.
  const updateInsertionTarget = (event: DragOverEvent) => {
    const { over, activatorEvent, delta } = event;
    const cursor = cursorFromEvent(activatorEvent, delta);
    const inCanvas = cursor && canvasRef.current
      ? pointInRect(cursor.x, cursor.y, canvasRef.current.getBoundingClientRect())
      : false;
    if (!inCanvas) {
      // Cursor is outside the canvas sider (e.g. dragged onto the app
      // sidebar or header). dnd-kit's closestCorners may still resolve a
      // droppable here via corner proximity, so we trust the rect test
      // instead and mark the drag as invalid.
      setInsertionTarget(null);
      setDraggingOverEmpty(false);
      setDraggingInvalid(true);
      return;
    }
    if (!over) {
      setInsertionTarget(null);
      setDraggingOverEmpty(false);
      setDraggingInvalid(false);
      return;
    }
    const overId = String(over.id);
    if (overId === 'canvas-empty') {
      setInsertionTarget(null);
      setDraggingOverEmpty(true);
      setDraggingInvalid(false);
      return;
    }
    setDraggingOverEmpty(false);
    // Library drags onto the delete zone are an explicit cancel — show
    // invalid feedback even though over is set.
    if (overId === 'canvas-delete' && isLibraryDrag(String(event.active.id))) {
      setInsertionTarget(null);
      setDraggingInvalid(true);
      return;
    }
    setDraggingInvalid(false);
    const overField = isCanvasDrag(overId);
    if (overField === null) {
      setInsertionTarget(null);
      return;
    }
    const overRect = over.rect;
    if (!overRect) {
      setInsertionTarget(null);
      return;
    }
    const overMidY = overRect.top + overRect.height / 2;
    const position: 'before' | 'after' = (cursor?.y ?? overRect.top) <= overMidY ? 'before' : 'after';
    setInsertionTarget({ fieldId: overField, position });
  };

  const handleDragOver = updateInsertionTarget;
  const handleDragMove = updateInsertionTarget;

  // Compute cursor position from the original pointer event + accumulated
  // drag delta. Used to test cursor-vs-canvas-rect independently of
  // dnd-kit's collision detection (which uses corners, not the cursor).
  const cursorFromEvent = (activatorEvent: Event | undefined, delta: { x: number; y: number }) => {
    const a = activatorEvent as PointerEvent | undefined;
    if (!a || typeof a.clientX !== 'number') return null;
    return { x: a.clientX + delta.x, y: a.clientY + delta.y };
  };
  const pointInRect = (x: number, y: number, r: DOMRect) =>
    x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

  const handleDragCancel = () => {
    setDraggingType(null);
    setDraggingFieldId(null);
    setInsertionTarget(null);
    setDraggingOverEmpty(false);
    setDraggingInvalid(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingType(null);
    setDraggingFieldId(null);
    setInsertionTarget(null);
    setDraggingOverEmpty(false);
    setDraggingInvalid(false);
    const { active, over, activatorEvent, delta } = event;
    // Final guard: even if dnd-kit resolved a droppable, cancel when the
    // cursor ended outside the canvas. This catches the closestCorners
    // corner-proximity false positives.
    const cursor = cursorFromEvent(activatorEvent, delta);
    const inCanvas = cursor && canvasRef.current
      ? pointInRect(cursor.x, cursor.y, canvasRef.current.getBoundingClientRect())
      : false;
    if (!inCanvas || !over) return;

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
        // Use cursor-based position from insertionTarget when available;
        // fall back to "after" if not (e.g. touch / quick click+release).
        const pos = insertionTarget?.fieldId === overField ? insertionTarget.position : 'after';
        const insertIdx = pos === 'before' ? overIdx : overIdx + 1;
        addFieldAt(lib.type, overFieldObj.sectionId, insertIdx);
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
      // Cursor-based: before/after from insertionTarget, default to existing
      // "swap with neighbor" semantics.
      const pos = insertionTarget?.fieldId === toId ? insertionTarget.position : 'after';
      let insertIdx: number;
      if (pos === 'before') {
        insertIdx = toIdx;
      } else {
        insertIdx = toIdx + (fromIdx < toIdx ? 1 : 0);
      }
      moveField(fromId, target.sectionId, insertIdx);
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
    // 画布 → 删除区
    if (overId === 'canvas-delete') {
      removeField(fromId);
      return;
    }
  };

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Layout style={{ height: '100%', overflow: 'hidden' }}>
        <TopBar />
        <Layout style={{ flex: 1, minHeight: 0 }}>
          <Sider width={260} theme="light" style={{ overflow: 'auto' }}>
            <ComponentLibrary />
          </Sider>
          <Content ref={canvasRef} style={{ background: '#f5f5f5', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Canvas
              insertionTarget={insertionTarget}
              draggingType={draggingType}
              draggingOverEmpty={draggingOverEmpty}
              draggingInvalid={draggingInvalid}
            />
          </Content>
          <Sider width={340} theme="light" style={{ overflow: 'auto' }}>
            <PropertyPanel />
          </Sider>
        </Layout>
      </Layout>
      <DragOverlay
        // Library→canvas drops default to animating the overlay back to the
        // source (the library card), which reads as "the field snapped back".
        // Replace with a fade-out so the overlay just disappears; the actual
        // field appears in the canvas where it was added.
        dropAnimation={{
          keyframes: () => [{ opacity: 1 }, { opacity: 0 }],
          duration: 150,
          easing: 'ease-out',
        }}
      >
        {draggingType && (
          <FieldPreview
            emoji={LIBRARY_TYPE_META[draggingType]?.emoji ?? '➕'}
            label={draggingInvalid ? '取消' : (LIBRARY_TYPE_META[draggingType]?.label ?? draggingType)}
            type={draggingType}
            invalid={draggingInvalid}
          />
        )}
        {draggingFieldId &&
          (() => {
            const field = fields.find((f) => f.id === draggingFieldId);
            if (!field) return null;
            return (
              <FieldPreview
                emoji={LIBRARY_TYPE_META[field.type]?.emoji ?? '🔧'}
                label={field.name || field.code}
                type={field.type}
                required={field.required}
                invalid={draggingInvalid}
              />
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

// 库类型 → 预览用的 emoji + 中文标签已抽到 features/designer/libraryMeta.ts
