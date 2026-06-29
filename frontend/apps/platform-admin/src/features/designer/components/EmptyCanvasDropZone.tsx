import { useDroppable } from '@dnd-kit/core';

interface Props {
  empty: boolean;
}

export function EmptyCanvasDropZone({ empty }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-empty',
    data: { source: 'canvas-empty' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        height: empty ? 200 : 30,
        marginTop: 8,
        borderTop: isOver ? '2px solid #1677ff' : empty ? 'none' : '1px dashed #d9d9d9',
        background: isOver ? '#f0f8ff' : 'transparent',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: 13,
        transition: 'all 0.15s',
      }}
    >
      {empty && (isOver ? '松开加到末尾' : '从左侧组件库拖拽或点击 [+]')}
    </div>
  );
}