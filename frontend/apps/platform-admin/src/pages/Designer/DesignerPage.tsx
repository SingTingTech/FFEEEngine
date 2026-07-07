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
          <FieldPreview
            emoji={LIBRARY_TYPE_META[draggingType]?.emoji ?? '➕'}
            label={LIBRARY_TYPE_META[draggingType]?.label ?? draggingType}
            type={draggingType}
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

// 库类型 → 预览用的 emoji + 中文标签。跟 ComponentLibrary.tsx 的
// FIELD_CATEGORIES 保持一致；如果 ComponentLibrary 加了新类型这里也要加。
const LIBRARY_TYPE_META: Record<string, { emoji: string; label: string }> = {
  text:        { emoji: '📝', label: '文本' },
  longtext:    { emoji: '📄', label: '长文本' },
  number:      { emoji: '🔢', label: '数字' },
  date:        { emoji: '📅', label: '日期' },
  datetime:    { emoji: '🕐', label: '日期时间' },
  select:      { emoji: '☑️', label: '单选' },
  multiselect: { emoji: '🔲', label: '多选' },
  section:     { emoji: '▢',  label: '分组' },
  subform:     { emoji: '📦', label: '子表单' },
  boolean:     { emoji: '✓',  label: '布尔' },
  file:        { emoji: '📁', label: '文件' },
  reference:   { emoji: '🔗', label: '引用' },
};

/**
 * DragOverlay content. Mirrors the look of a real CanvasField card (white
 * bg, subtle border, type icon + label + type tag) so the user sees what
 * they're about to drop instead of a generic "添加 文本" pill.
 */
function FieldPreview({
  emoji,
  label,
  type,
  required = false,
}: {
  emoji: string;
  label: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#fff',
        padding: '6px 12px',
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        fontSize: 13,
        minWidth: 220,
        cursor: 'grabbing',
      }}
    >
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ flex: 1, color: '#333' }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          padding: '1px 6px',
          background: '#f0f0f0',
          color: '#666',
          borderRadius: 2,
        }}
      >
        {type}
      </span>
      {required && (
        <span
          style={{
            fontSize: 11,
            padding: '1px 6px',
            background: '#fff1f0',
            color: '#cf1322',
            borderRadius: 2,
            border: '1px solid #ffa39e',
          }}
        >
          必填
        </span>
      )}
    </div>
  );
}
