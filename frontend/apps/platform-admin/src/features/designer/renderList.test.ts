import { describe, it, expect } from 'vitest';
import { buildRenderList } from './renderList';
import type { FormFieldDefVO, SectionVO } from '@/types/designer';

const field = (id: string, sectionId: string | null = null): FormFieldDefVO => ({
  id, schemaId: '100', code: id, name: id, type: 'text',
  required: false, defaultValue: null, sortOrder: 0,
  config: null, validation: null, targetColumn: null,
  sectionId, isLinkField: false,
  createTime: '', updateTime: '',
});

const section = (id: string): SectionVO => ({
  id, schemaId: '100', name: id, description: null, sortOrder: 0,
  createTime: '', updateTime: '',
});

describe('buildRenderList', () => {
  it('空 fields 返回空数组', () => {
    expect(buildRenderList([], [])).toEqual([]);
  });

  it('全部是根字段', () => {
    const result = buildRenderList(
      [field('a'), field('b'), field('c')],
      []
    );
    expect(result).toEqual([
      { kind: 'field', field: expect.objectContaining({ id: 'a' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'b' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'c' }) },
    ]);
  });

  it('单个分组连续 → 一个 section 项', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('b', 's1'), field('c', 's1')],
      [section('s1')]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: 'section',
      section: expect.objectContaining({ id: 's1' }),
      fields: [expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b' }), expect.objectContaining({ id: 'c' })],
    });
  });

  it('分组分散在根字段之间 → 出现多次', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('b', null), field('c', 's1')],
      [section('s1')]
    );
    expect(result).toEqual([
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'a' })] },
      { kind: 'field', field: expect.objectContaining({ id: 'b' }) },
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'c' })] },
    ]);
  });

  it('多分组交错', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('b', 's2'), field('c', 's1')],
      [section('s1'), section('s2')]
    );
    expect(result.map((r) => r.kind)).toEqual(['section', 'section', 'section']);
    expect(result[0]).toMatchObject({ kind: 'section', section: expect.objectContaining({ id: 's1' }) });
    expect(result[1]).toMatchObject({ kind: 'section', section: expect.objectContaining({ id: 's2' }) });
    expect(result[2]).toMatchObject({ kind: 'section', section: expect.objectContaining({ id: 's1' }) });
  });

  it('引用不存在的 sectionId → 视为 root', () => {
    const result = buildRenderList(
      [field('a', 'ghost'), field('b', null)],
      [section('s1')]
    );
    expect(result).toEqual([
      { kind: 'field', field: expect.objectContaining({ id: 'a' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'b' }) },
    ]);
  });

  it('多个根字段夹在分组之间', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('x', null), field('y', null), field('b', 's1')],
      [section('s1')]
    );
    expect(result).toEqual([
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'a' })] },
      { kind: 'field', field: expect.objectContaining({ id: 'x' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'y' }) },
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'b' })] },
    ]);
  });
});
