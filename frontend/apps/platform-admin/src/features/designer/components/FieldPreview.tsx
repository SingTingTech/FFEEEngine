/**
 * Mini card that mirrors the look of a real CanvasField — white bg,
 * subtle border, type icon + label + type tag (+ optional red 必填 tag).
 *
 * Used in two places:
 *  - DragOverlay (follows the cursor during drag)
 *  - Canvas at the insertion point (a ghost card at half-opacity, so
 *    the user sees WHERE the new field will land, not just the line)
 *
 * `invalid` mode (cursor outside any valid drop target) switches to
 * red border + dashed + 取消 label so the user sees the drag will
 * be cancelled on release.
 */
export function FieldPreview({
  emoji,
  label,
  type,
  required = false,
  opacity = 1,
  invalid = false,
}: {
  emoji: string;
  label: string;
  type: string;
  required?: boolean;
  opacity?: number;
  invalid?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#fff',
        padding: '6px 12px',
        border: invalid ? '2px dashed #ff4d4f' : '1px solid #d9d9d9',
        borderRadius: 4,
        boxShadow: invalid
          ? '0 6px 20px rgba(255,77,79,0.3)'
          : '0 6px 20px rgba(0,0,0,0.18)',
        fontSize: 13,
        minWidth: 220,
        opacity,
        cursor: 'grabbing',
      }}
    >
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ flex: 1, color: invalid ? '#ff4d4f' : '#333' }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          padding: '1px 6px',
          background: invalid ? '#fff1f0' : '#f0f0f0',
          color: invalid ? '#cf1322' : '#666',
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