import { describe, it, expect } from 'vitest';
import {
  libraryItemId, canvasItemId, canvasSectionId,
  isLibraryDrag, isCanvasDrag, getInsertIndex,
  getInsertPosition,
} from './dndHelpers';

describe('dndHelpers', () => {
  it('libraryItemId / canvasItemId format', () => {
    expect(libraryItemId('text')).toBe('library-text');
    expect(canvasItemId('42')).toBe('canvas-field-42');
    expect(canvasSectionId('7')).toBe('canvas-section-7');
  });

  it('isLibraryDrag identifies library drags', () => {
    expect(isLibraryDrag('library-text')).toEqual({ type: 'text' });
    expect(isLibraryDrag('canvas-field-1')).toBeNull();
    expect(isLibraryDrag('garbage')).toBeNull();
  });

  it('isCanvasDrag extracts field id (including temp ids)', () => {
    expect(isCanvasDrag('canvas-field-42')).toBe('42');
    expect(isCanvasDrag('canvas-field-tmp-0')).toBe('tmp-0');
    expect(isCanvasDrag('library-text')).toBeNull();
  });

  it('getInsertIndex returns field position or end', () => {
    const fields = [{ id: '1' }, { id: '2' }, { id: '3' }] as any;
    expect(getInsertIndex('canvas-field-2', fields)).toBe(1);
    expect(getInsertIndex('garbage', fields)).toBe(fields.length);
  });

  describe('getInsertPosition', () => {
    // over.rect: { top: 100, height: 80 }  → midY = 140
    const overRect = { top: 100, height: 80 };

    it('cursor 在 over 上半 → before', () => {
      expect(getInsertPosition(overRect, 120)).toBe('before');
    });

    it('cursor 在 over 下半 → after', () => {
      expect(getInsertPosition(overRect, 160)).toBe('after');
    });

    it('cursor 在 midY 之上（不含）→ before', () => {
      expect(getInsertPosition(overRect, 139)).toBe('before');
    });

    it('cursor 在 midY 之上（含）→ before（边界选 before，保持一致）', () => {
      expect(getInsertPosition(overRect, 140)).toBe('before');
    });

    it('cursor 在 midY 之下 → after', () => {
      expect(getInsertPosition(overRect, 141)).toBe('after');
    });

    it('zero-height rect → 视为 before（退化情况）', () => {
      expect(getInsertPosition({ top: 100, height: 0 }, 100)).toBe('before');
    });
  });
});
