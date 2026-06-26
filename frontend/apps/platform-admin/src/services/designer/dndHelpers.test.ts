import { describe, it, expect } from 'vitest';
import {
  libraryItemId, canvasItemId, canvasSectionId,
  isLibraryDrag, isCanvasDrag, getInsertIndex,
} from './dndHelpers';

describe('dndHelpers', () => {
  it('libraryItemId / canvasItemId format', () => {
    expect(libraryItemId('text')).toBe('library-text');
    expect(canvasItemId(42)).toBe('canvas-field-42');
    expect(canvasSectionId(7)).toBe('canvas-section-7');
  });

  it('isLibraryDrag identifies library drags', () => {
    expect(isLibraryDrag('library-text')).toEqual({ type: 'text' });
    expect(isLibraryDrag('canvas-field-1')).toBeNull();
    expect(isLibraryDrag('garbage')).toBeNull();
  });

  it('isCanvasDrag extracts field id (including negative temp ids)', () => {
    expect(isCanvasDrag('canvas-field-42')).toBe(42);
    expect(isCanvasDrag('canvas-field--1')).toBe(-1);
    expect(isCanvasDrag('library-text')).toBeNull();
  });

  it('getInsertIndex returns field position or end', () => {
    const fields = [{ id: 1 }, { id: 2 }, { id: 3 }] as any;
    expect(getInsertIndex('canvas-field-2', fields)).toBe(1);
    expect(getInsertIndex('garbage', fields)).toBe(fields.length);
  });
});
