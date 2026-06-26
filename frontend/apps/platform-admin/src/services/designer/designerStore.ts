import { create } from 'zustand';
import type {
  FormFieldDefVO, RelationshipVO, SectionVO,
  LinkFieldPair,
} from '@/types/designer';

export interface DesignerState {
  // Server-fetched data (synced via TanStack Query)
  formId: number | null;
  schemaId: number | null;
  formName: string;
  targetTable: string | null;
  version: number;
  isCurrent: boolean;

  // Draft state (client-editable, persisted on save)
  draftFields: FormFieldDefVO[];
  draftSections: SectionVO[];
  draftRelationships: RelationshipVO[];

  // UI state
  selectedFieldId: number | null;
  isDirty: boolean;

  // Setters (called by load actions)
  loadSchema: (params: {
    formId: number;
    schemaId: number;
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
  updateField: (fieldId: number, patch: Partial<FormFieldDefVO>) => void;
  removeField: (fieldId: number) => void;
  reorderFields: (orderedIds: number[]) => void;
  setFieldSection: (fieldId: number, sectionId: number | null) => void;

  // Section actions
  addSection: (name: string) => SectionVO;
  updateSection: (sectionId: number, patch: Partial<SectionVO>) => void;
  removeSection: (sectionId: number) => void;
  reorderSections: (orderedIds: number[]) => void;

  // Subform container actions
  updateSubformConfig: (fieldId: number, config: {
    subformRefId: number;
    isList: boolean;
    linkFields: LinkFieldPair[];
    onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  }) => void;

  // Selection
  selectField: (fieldId: number | null) => void;
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

let _tempIdCounter = -1;
const nextTempId = () => _tempIdCounter--;

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
      schemaId: 0,
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
      schemaId: 0,
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
      name: s.name,
      description: s.description ?? undefined,
      sortOrder: s.sortOrder,
    })),
  };
}