import { create } from 'zustand';
import type {
  FormFieldDefVO, RelationshipVO, SectionVO,
  LinkFieldPair,
} from '@/types/designer';

export interface DesignerState {
  // Server-fetched data (synced via TanStack Query)
  formId: string | null;
  schemaId: string | null;
  formName: string;
  targetTable: string | null;
  version: number;
  isCurrent: boolean;

  // Draft state (client-editable, persisted on save)
  draftFields: FormFieldDefVO[];
  draftSections: SectionVO[];
  draftRelationships: RelationshipVO[];

  // UI state
  selectedFieldId: string | null;
  isDirty: boolean;

  // Setters (called by load actions)
  loadSchema: (params: {
    formId: string;
    schemaId: string;
    formName: string;
    targetTable: string | null;
    version: number;
    isCurrent: boolean;
    fields: FormFieldDefVO[];
    sections: SectionVO[];
    relationships: RelationshipVO[];
  }) => void;
  reset: () => void;

  // Field actions
  addField: (type: string, atIndex?: number) => FormFieldDefVO;
  addFieldAt: (type: string, sectionId: string | null, index: number) => FormFieldDefVO;
  updateField: (fieldId: string, patch: Partial<FormFieldDefVO>) => void;
  removeField: (fieldId: string) => void;
  reorderFields: (orderedIds: string[]) => void;
  setFieldSection: (fieldId: string, sectionId: string | null) => void;

  // Section actions
  addSection: (name: string) => SectionVO;
  updateSection: (sectionId: string, patch: Partial<SectionVO>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (orderedIds: string[]) => void;

  // Subform container actions
  updateSubformConfig: (fieldId: string, config: {
    subformRefId: string;
    isList: boolean;
    linkFields: LinkFieldPair[];
    onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  }) => void;

  // Selection
  selectField: (fieldId: string | null) => void;
}

const EMPTY: Pick<
  DesignerState,
  | 'formId'
  | 'schemaId'
  | 'formName'
  | 'targetTable'
  | 'version'
  | 'isCurrent'
  | 'draftFields'
  | 'draftSections'
  | 'draftRelationships'
  | 'selectedFieldId'
  | 'isDirty'
> = {
  formId: null,
  schemaId: null,
  formName: '',
  targetTable: null,
  version: 0,
  isCurrent: false,
  draftFields: [],
  draftSections: [],
  draftRelationships: [],
  selectedFieldId: null,
  isDirty: false,
};

// Use a "tmp-" prefix for client-only IDs that haven't been persisted yet.
// Server-returned IDs are string Long values; these temp IDs are visually distinct.
let _tempIdCounter = 0;
const nextTempId = () => `tmp-${_tempIdCounter++}`;

export const useDesignerStore = create<DesignerState>((set) => ({
  ...EMPTY,

  loadSchema: (params) => set({
    formId: params.formId,
    schemaId: params.schemaId,
    formName: params.formName,
    targetTable: params.targetTable,
    version: params.version,
    isCurrent: params.isCurrent,
    draftFields: params.fields,
    draftSections: params.sections,
    draftRelationships: params.relationships,
    selectedFieldId: null,
    isDirty: false,
  }),

  reset: () => set(EMPTY),

  addField: (type, atIndex) => {
    const newField: FormFieldDefVO = {
      id: nextTempId(),
      schemaId: '0',
      code: `${type}_${Date.now()}`,
      name: type,
      type,
      required: false,
      defaultValue: null,
      sortOrder: 0,
      config: null,
      validation: null,
      targetColumn: null,
      sectionId: null,
      isLinkField: false,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    set((state) => {
      const fields = [...state.draftFields];
      if (atIndex === undefined || atIndex >= fields.length) {
        fields.push(newField);
      } else {
        fields.splice(atIndex, 0, newField);
      }
      return { draftFields: fields, isDirty: true, selectedFieldId: newField.id };
    });
    return newField;
  },

  addFieldAt: (type, sectionId, index) => {
    const newField: FormFieldDefVO = {
      id: nextTempId(),
      schemaId: '0',
      code: `${type}_${Date.now()}`,
      name: type,
      type,
      required: false,
      defaultValue: null,
      sortOrder: 0,
      config: null,
      validation: null,
      targetColumn: null,
      sectionId,
      isLinkField: false,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    set((state) => {
      const fields = [...state.draftFields];
      const clampedIndex = Math.max(0, Math.min(index, fields.length));
      fields.splice(clampedIndex, 0, newField);
      return { draftFields: fields, isDirty: true, selectedFieldId: newField.id };
    });
    return newField;
  },

  updateField: (fieldId, patch) => set((state) => ({
    draftFields: state.draftFields.map((f) =>
      f.id === fieldId ? { ...f, ...patch } : f
    ),
    isDirty: true,
  })),

  removeField: (fieldId) => set((state) => ({
    draftFields: state.draftFields.filter((f) => f.id !== fieldId),
    selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
    isDirty: true,
  })),

  reorderFields: (orderedIds) => set((state) => {
    const map = new Map(state.draftFields.map((f) => [f.id, f]));
    return {
      draftFields: orderedIds.map((id) => map.get(id)!).filter(Boolean),
      isDirty: true,
    };
  }),

  setFieldSection: (fieldId, sectionId) => set((state) => ({
    draftFields: state.draftFields.map((f) =>
      f.id === fieldId ? { ...f, sectionId } : f
    ),
    isDirty: true,
  })),

  addSection: (name) => {
    const newSection: SectionVO = {
      id: nextTempId(),
      schemaId: '0',
      name,
      description: null,
      sortOrder: 0,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    set((state) => ({
      draftSections: [...state.draftSections, newSection],
      isDirty: true,
    }));
    return newSection;
  },

  updateSection: (sectionId, patch) => set((state) => ({
    draftSections: state.draftSections.map((s) =>
      s.id === sectionId ? { ...s, ...patch } : s
    ),
    isDirty: true,
  })),

  removeSection: (sectionId) => set((state) => ({
    draftSections: state.draftSections.filter((s) => s.id !== sectionId),
    isDirty: true,
  })),

  reorderSections: (orderedIds) => set((state) => {
    const map = new Map(state.draftSections.map((s) => [s.id, s]));
    return {
      draftSections: orderedIds.map((id) => map.get(id)!).filter(Boolean),
      isDirty: true,
    };
  }),

  updateSubformConfig: (fieldId, config) => set((state) => ({
    draftFields: state.draftFields.map((f) =>
      f.id === fieldId ? { ...f, config: { ...config } } : f
    ),
    isDirty: true,
  })),

  selectField: (fieldId) => set({ selectedFieldId: fieldId }),
}));

// Helper: build UpdateSchemaRequest from current draft state
export function buildUpdateRequest(state: DesignerState) {
  return {
    name: state.formName,
    fields: state.draftFields.map((f) => ({
      code: f.code,
      name: f.name,
      type: f.type,
      required: f.required,
      defaultValue: f.defaultValue ?? undefined,
      sortOrder: f.sortOrder,
      config: f.config ?? undefined,
      validation: f.validation ?? undefined,
      targetColumn: f.targetColumn ?? undefined,
      sectionId: f.sectionId ?? undefined,
    })),
    relationships: state.draftRelationships.map((r) => ({
      parentFormId: r.parentFormId,
      childFormId: r.childFormId,
      relationType: r.relationType,
      parentLinkField: r.parentLinkField ?? undefined,
      childLinkField: r.childLinkField,
      onDelete: r.onDelete,
    })),
    sections: state.draftSections.map((s) => ({
      id: s.id,                                       // client-side id (temp or server)
      name: s.name,
      description: s.description ?? undefined,
      sortOrder: s.sortOrder,
    })),
  };
}
