import { useDndContext, useDroppable } from '@dnd-kit/core';
import { isCanvasDrag } from '@/services/designer/dndHelpers';

/**
 * Drop zone under the canvas: drag a canvas field here to remove it.
 * Library items dragged here are ignored (they have no "source" to delete).
 */
export function DeleteDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-delete',
    data: { source: 'canvas-delete' },
  });
  const { active } = useDndContext();
  const activeId = active ? String(active.id) : null;
  const isFromCanvas = isCanvasDrag(activeId ?? '') !== null;
  const showActive = isOver && isFromCanvas;

  return (
    <div
      ref={setNodeRef}
      style={{
        marginTop: 16,
        padding: '20px 12px',
        border: `2px dashed ${showActive ? '#ff4d4f' : '#d9d9d9'}`,
        background: showActive ? '#fff1f0' : '#fafafa',
        borderRadius: 4,
        textAlign: 'center',
        color: showActive ? '#ff4d4f' : '#999',
        fontSize: 13,
        transition: 'all 0.15s',
        cursor: showActive ? 'copy' : 'default',
      }}
    >
      <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 4 }}>🗑️</div>
      <div>{showActive ? '松手删除' : '拖到此处删除字段'}</div>
    </div>
  );
}
