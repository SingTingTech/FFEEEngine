import type { FormFieldDefVO } from '@/types/designer';
import type { ClientRect } from '@dnd-kit/core';

// Stable, sortable IDs for dnd-kit
export const libraryItemId = (type: string) => `library-${type}`;
export const canvasItemId = (fieldId: string) => `canvas-field-${fieldId}`;
export const canvasSectionId = (sectionId: string) => `canvas-section-${sectionId}`;

// Identify what's being dragged
export function isLibraryDrag(activeId: string): { type: string } | null {
  if (!activeId.startsWith('library-')) return null;
  return { type: activeId.slice('library-'.length) };
}

export function isCanvasDrag(activeId: string): string | null {
  const m = activeId.match(/^canvas-field-(.+)$/);
  return m ? m[1] : null;
}

// Insertion index calculator
export function getInsertIndex(overId: string, fields: FormFieldDefVO[]): number {
  const m = overId.match(/^canvas-field-(.+)$/);
  if (!m) return fields.length;   // dropped on empty area = end
  const overIdStr = m[1];
  return fields.findIndex((f) => f.id === overIdStr);
}

/**
 * Cursor-based 上下判定：cursor 在 over 中线（不含）之上 → 'before'，
 * 在中线（含）之下 → 'after'。over.rect 来自 dnd-kit 的 over.rect。
 */
export function getInsertPosition(
  overRect: Pick<ClientRect, 'top' | 'height'>,
  cursorY: number
): 'before' | 'after' {
  if (overRect.height === 0) return 'before';
  const midY = overRect.top + overRect.height / 2;
  return cursorY <= midY ? 'before' : 'after';
}
