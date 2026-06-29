import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignerStore } from './designerStore';
import type { FormFieldDefVO, SectionVO } from '@/types/designer';

const sampleField = (overrides: Partial<FormFieldDefVO> = {}): FormFieldDefVO => ({
  id: '1', schemaId: '100', code: 'f1', name: '字段1', type: 'text',
  required: false, defaultValue: null, sortOrder: 0,
  config: null, validation: null, targetColumn: null, sectionId: null, isLinkField: false,
  createTime: '2026-06-26', updateTime: '2026-06-26',
  ...overrides,
});

const sampleSection = (overrides: Partial<SectionVO> = {}): SectionVO => ({
  id: '10', schemaId: '100', name: '基本信息', description: null, sortOrder: 0,
  createTime: '2026-06-26', updateTime: '2026-06-26',
  ...overrides,
});

describe('designerStore', () => {
  beforeEach(() => {
    useDesignerStore.getState().reset();
  });

  it('loadSchema populates state', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: '订单', targetTable: 'orders',
      version: 1, isCurrent: true, fields: [sampleField()], sections: [],
      relationships: [],
    });
    const state = useDesignerStore.getState();
    expect(state.formId).toBe('1');
    expect(state.draftFields).toHaveLength(1);
    expect(state.isDirty).toBe(false);
  });

  it('addField appends new field and marks dirty', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [], sections: [], relationships: [],
    });
    useDesignerStore.getState().addField('text');
    const state = useDesignerStore.getState();
    expect(state.draftFields).toHaveLength(1);
    expect(state.draftFields[0].type).toBe('text');
    expect(state.isDirty).toBe(true);
  });

  it('addField inserts at specified index', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().addField('number', 1);
    const state = useDesignerStore.getState();
    expect(state.draftFields).toHaveLength(3);
    expect(state.draftFields[1].type).toBe('number');
  });

  it('updateField patches matching field', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField()], sections: [], relationships: [],
    });
    useDesignerStore.getState().updateField('1', { name: '新名' });
    expect(useDesignerStore.getState().draftFields[0].name).toBe('新名');
  });

  it('removeField deletes and clears selection', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField()], sections: [], relationships: [],
    });
    useDesignerStore.getState().selectField('1');
    useDesignerStore.getState().removeField('1');
    expect(useDesignerStore.getState().draftFields).toHaveLength(0);
    expect(useDesignerStore.getState().selectedFieldId).toBeNull();
  });

  it('reorderFields respects new order', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' }), sampleField({ id: '3' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().reorderFields(['3', '1', '2']);
    const ids = useDesignerStore.getState().draftFields.map((f) => f.id);
    expect(ids).toEqual(['3', '1', '2']);
  });

  it('addSection creates new section', () => {
    useDesignerStore.getState().addSection('分组A');
    expect(useDesignerStore.getState().draftSections).toHaveLength(1);
    expect(useDesignerStore.getState().draftSections[0].name).toBe('分组A');
  });

  it('setFieldSection assigns and clears', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField()], sections: [sampleSection()], relationships: [],
    });
    useDesignerStore.getState().setFieldSection('1', '10');
    expect(useDesignerStore.getState().draftFields[0].sectionId).toBe('10');
    useDesignerStore.getState().setFieldSection('1', null);
    expect(useDesignerStore.getState().draftFields[0].sectionId).toBeNull();
  });

  it('updateSubformConfig sets config', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField()], sections: [], relationships: [],
    });
    useDesignerStore.getState().updateSubformConfig('1', {
      subformRefId: '99', isList: true, linkFields: [{ parent: 'a', child: 'b' }],
      onDelete: 'CASCADE',
    });
    expect(useDesignerStore.getState().draftFields[0].config).toMatchObject({
      subformRefId: '99', isList: true,
    });
  });
});

describe('addFieldAt', () => {
  it('sectionId=null 在数组末尾追加根字段', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().addFieldAt('text', null, 2);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(3);
    expect(fields[2].type).toBe('text');
    expect(fields[2].sectionId).toBeNull();
  });

  it('sectionId=null 在中间插入根字段', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().addFieldAt('number', null, 1);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields.map((f) => f.id)).toEqual(['1', expect.stringMatching(/^tmp-\d+$/), '2']);
  });

  it('sectionId="s1" 插入到分组末尾', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1', sectionId: 's1' }), sampleField({ id: '2' })],
      sections: [sampleSection({ id: 's1' })], relationships: [],
    });
    useDesignerStore.getState().addFieldAt('date', 's1', 1);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(3);
    expect(fields[1].type).toBe('date');
    expect(fields[1].sectionId).toBe('s1');
  });

  it('addFieldAt 标 isDirty 并 select 新字段', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [], sections: [], relationships: [],
    });
    const created = useDesignerStore.getState().addFieldAt('text', null, 0);
    const state = useDesignerStore.getState();
    expect(state.isDirty).toBe(true);
    expect(state.selectedFieldId).toBe(created.id);
  });
});

describe('moveField', () => {
  it('同组内重排', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' }), sampleField({ id: '3' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 2);
    expect(useDesignerStore.getState().draftFields.map((f) => f.id)).toEqual(['2', '3', '1']);
    expect(useDesignerStore.getState().draftFields[2].sectionId).toBeNull();
  });

  it('跨组移动 - 根 → 分组', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [
        sampleField({ id: '1' }),
        sampleField({ id: '2', sectionId: 's1' }),
      ],
      sections: [sampleSection({ id: 's1' })], relationships: [],
    });
    useDesignerStore.getState().moveField('1', 's1', 2);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(2);
    expect(fields[1].id).toBe('1');
    expect(fields[1].sectionId).toBe('s1');
  });

  it('跨组移动 - 分组 → 根', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [
        sampleField({ id: '1', sectionId: 's1' }),
        sampleField({ id: '2' }),
      ],
      sections: [sampleSection({ id: 's1' })], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 0);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields[0].id).toBe('1');
    expect(fields[0].sectionId).toBeNull();
  });

  it('分组 A → 分组 B', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [
        sampleField({ id: '1', sectionId: 's1' }),
        sampleField({ id: '2', sectionId: 's2' }),
      ],
      sections: [sampleSection({ id: 's1' }), sampleSection({ id: 's2' })],
      relationships: [],
    });
    useDesignerStore.getState().moveField('1', 's2', 2);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(2);
    expect(fields[1].id).toBe('1');
    expect(fields[1].sectionId).toBe('s2');
  });

  it('移动到末尾（targetIndex 越界）→ 插入到末尾', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 99);
    expect(useDesignerStore.getState().draftFields.map((f) => f.id)).toEqual(['2', '1']);
  });

  it('不存在的 fieldId → no-op', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('ghost', null, 1);
    expect(useDesignerStore.getState().draftFields).toHaveLength(1);
  });

  it('moveField 标 isDirty', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 2);
    expect(useDesignerStore.getState().isDirty).toBe(true);
  });
});
