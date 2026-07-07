/**
 * Mini card that mirrors the look of a real CanvasField — white bg,
 * subtle border, type icon + label + type tag (+ optional red 必填 tag).
 *
 * Used in two places:
 *  - DragOverlay (follows the cursor during drag)
 *  - Canvas at the insertion point (a ghost card at half-opacity, so
 *    the user sees WHERE the new field will land, not just the line)
 */
export function FieldPreview({
  emoji,
  label,
  type,
  required = false,
  opacity = 1,
}: {
  emoji: string;
  label: string;
  type: string;
  required?: boolean;
  opacity?: number;
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
        opacity,
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