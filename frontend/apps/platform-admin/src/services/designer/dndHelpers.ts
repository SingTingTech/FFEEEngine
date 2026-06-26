import type { FormFieldDefVO } from '@/types/designer';

// Stable, sortable IDs for dnd-kit
export const libraryItemId = (type: string) => `library-${type}`;
export const canvasItemId = (fieldId: number) => `canvas-field-${fieldId}`;
export const canvasSectionId = (sectionId: number) => `canvas-section-${sectionId}`;

// Identify what's being dragged
export function isLibraryDrag(activeId: string): { type: string } | null {
  if (!activeId.startsWith('library-')) return null;
  return { type: activeId.slice('library-'.length) };
}

export function isCanvasDrag(activeId: string): number | null {
  const m = activeId.match(/^canvas-field-(-?\d+)$/);
  return m ? Number(m[1]) : null;
}

// Insertion index calculator
export function getInsertIndex(overId: string, fields: FormFieldDefVO[]): number {
  const m = overId.match(/^canvas-field-(-?\d+)$/);
  if (!m) return fields.length;   // dropped on empty area = end
  const overId_num = Number(m[1]);
  return fields.findIndex((f) => f.id === overId_num);
}
