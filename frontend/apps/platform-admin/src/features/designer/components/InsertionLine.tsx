// InsertionLine — v1.1: 组件已就绪但 Canvas 未集成（依赖 onDragOver tracking），
// 视觉反馈靠 Section 框 + EmptyCanvasDropZone 的 isOver 高亮 + DragOverlay 预览。
// v1.2 再把 InsertionLine 集成进 Canvas，实现 inline 字段间插入线。
interface Props {
  active: boolean;
}

export function InsertionLine({ active }: Props) {
  if (!active) return null;
  return (
    <div
      style={{
        height: 2,
        background: '#1677ff',
        borderRadius: 1,
        margin: '2px 0',
        pointerEvents: 'none',
      }}
      data-testid="insertion-line"
    />
  );
}