import { useEffect, useState } from 'react';
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
} from '@dnd-kit/core';
import { designerApi } from '@/services/designer/designerApi';
import { useDesignerStore } from '@/services/designer/designerStore';
import { isLibraryDrag, isCanvasDrag } from '@/services/designer/dndHelpers';
import { TopBar } from '@/features/designer/components/TopBar';
import { ComponentLibrary } from '@/features/designer/components/ComponentLibrary';
import { Canvas } from '@/features/designer/components/Canvas';
import { PropertyPanel } from '@/features/designer/components/PropertyPanel';

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

  const handleDragCancel = () => {
    setDraggingType(null);
    setDraggingFieldId(null);
  };

  const handleDragEnd = (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
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
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Layout style={{ height: '100%', overflow: 'hidden' }}>
        <TopBar />
        <Layout style={{ flex: 1, minHeight: 0 }}>
          <Sider width={260} theme="light" style={{ overflow: 'auto' }}>
            <ComponentLibrary />
          </Sider>
          <Content style={{ background: '#f5f5f5', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Canvas />
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
          <div
            style={{
              background: '#fff',
              padding: '6px 12px',
              border: '2px solid #1677ff',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: 0.9,
            }}
          >
            + {draggingType}
          </div>
        )}
        {draggingFieldId &&
          (() => {
            const field = fields.find((f) => f.id === draggingFieldId);
            if (!field) return null;
            return (
              <div
                style={{
                  background: '#fff',
                  padding: '6px 12px',
                  border: '2px solid #1677ff',
                  borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  opacity: 0.9,
                }}
              >
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
