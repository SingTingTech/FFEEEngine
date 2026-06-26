# Part 1: Frontend Infrastructure

**Phase:** 1 of 6
**Tasks:** 1.1 – 1.5
**End state:** All designer types defined, `designerApi` works, `designerStore` has all actions, dnd-kit installed.

**Working directory:** `/home/cris/dev/safeValidator/frontend/`

Reference design doc §11 for full file structure. The design doc is the source of truth for component layout.

---

## Task 1.1: Add dnd-kit dependencies

**Files:**
- Modify: `apps/platform-admin/package.json`

- [ ] **Step 1: Add dnd-kit packages**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Verify `apps/platform-admin/package.json` includes the three packages.

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add apps/platform-admin/package.json pnpm-lock.yaml
git commit -m "feat(designer): add dnd-kit dependencies"
```

---

## Task 1.2: Designer TypeScript types

**Files:**
- Create: `apps/platform-admin/src/types/designer.ts`

- [ ] **Step 1: Create designer types file**

```typescript
// Mirror of backend DTOs
export interface FormVO {
  id: number;
  formId: number;
  version: number;
  name: string;
  description: string | null;
  status: number;
  targetTable: string | null;
  isCurrent: boolean;
  createTime: string;
  updateTime: string;
}

export interface SchemaVersionVO {
  schemaId: number;
  formId: number;
  version: number;
  isCurrent: boolean;
  name: string;
  createTime: string;
}

export interface FormFieldDefVO {
  id: number;
  schemaId: number;
  code: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  sortOrder: number;
  config: Record<string, any> | null;
  validation: Record<string, any> | null;
  targetColumn: string | null;
  sectionId: number | null;        // NEW from V5
  isLinkField: boolean;
  createTime: string;
  updateTime: string;
}

export interface RelationshipVO {
  id: number;
  schemaId: number;
  parentFormId: number;
  childFormId: number;
  relationType: 'ONE_TO_ONE' | 'ONE_TO_MANY';
  parentLinkField: string | null;
  childLinkField: string;
  onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  createTime: string;
}

export interface SectionVO {
  id: number;
  schemaId: number;
  name: string;
  description: string | null;
  sortOrder: number;
  createTime: string;
  updateTime: string;
}

export interface SchemaDetailVO {
  formId: number;
  version: number;
  schemaId: number;
  name: string;
  description: string | null;
  targetTable: string | null;
  isCurrent: boolean;
  createTime: string;
  fields: FormFieldDefVO[];
  relationships: RelationshipVO[];
  sections: SectionVO[];
}

export interface CreateFormRequest {
  name: string;
  code?: string;
  description?: string;
  targetTable?: string | null;       // null = use form_data
}

export interface CreateFieldRequest {
  code: string;
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  sortOrder?: number;
  config?: Record<string, any>;
  validation?: Record<string, any>;
  targetColumn?: string;
  sectionId?: number;                 // NEW from V5
}

export interface CreateRelationshipRequest {
  parentFormId: number;
  childFormId: number;
  relationType: 'ONE_TO_ONE' | 'ONE_TO_MANY';
  parentLinkField?: string;
  childLinkField: string;
  onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
}

export interface CreateSectionRequest {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateSectionRequest {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  fields: CreateFieldRequest[];
  relationships: CreateRelationshipRequest[];
  sections: CreateSectionRequest[];
}

export interface FormBusinessKey {
  id: number;
  formId: number;
  fieldId: number;
  keyOrder: number;
}

export interface ColumnInfo {
  name: string;
  jdbcType: number;
  typeName: string;
  nullable: boolean;
  size: number | null;
}

// Subform config (stored in form_field_def.config JSONB for type='subform' fields)
export interface SubformConfig {
  subformRefId: number;
  isList: boolean;
  linkFields: LinkFieldPair[];
  onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
}

export interface LinkFieldPair {
  parent: string;   // parent field code
  child: string;    // child field code
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/types/designer.ts
git commit -m "feat(designer): add TypeScript types matching backend DTOs"
```

---

## Task 1.3: designerApi (fetch wrapper)

**Files:**
- Create: `apps/platform-admin/src/services/designer/designerApi.ts`

- [ ] **Step 1: Create designerApi**

```typescript
import { http, request } from '@/api/http';
import type { Result } from '@safe-validator/shared-types';
import type {
  FormVO, SchemaDetailVO, SchemaVersionVO, FormFieldDefVO,
  RelationshipVO, SectionVO, FormBusinessKey, ColumnInfo,
  CreateFormRequest, CreateFieldRequest, CreateRelationshipRequest,
  CreateSectionRequest, UpdateSectionRequest, UpdateSchemaRequest,
} from '@/types/designer';

export const designerApi = {
  // Forms
  listForms: () =>
    request(http.get<Result<FormVO[]>>('/forms')),
  createForm: (req: CreateFormRequest) =>
    request(http.post<Result<number>>('/forms', req)),
  getForm: (formId: number) =>
    request(http.get<Result<SchemaDetailVO>>(`/forms/${formId}/schema`)),
  getVersions: (formId: number) =>
    request(http.get<Result<SchemaVersionVO[]>>(`/forms/${formId}/versions`)),
  publishNewVersion: (formId: number, req: UpdateSchemaRequest) =>
    request(http.put<Result<number>>(`/forms/${formId}/schema`, req)),
  deleteForm: (formId: number) =>
    request(http.delete<Result<void>>(`/forms/${formId}`)),

  // Fields
  listFields: (formId: number) =>
    request(http.get<Result<FormFieldDefVO[]>>(`/forms/${formId}/fields`)),
  addField: (formId: number, req: CreateFieldRequest) =>
    request(http.post<Result<number>>(`/forms/${formId}/fields`, req)),
  updateField: (formId: number, fieldId: number, req: Partial<CreateFieldRequest>) =>
    request(http.put<Result<void>>(`/forms/${formId}/fields/${fieldId}`, req)),
  deleteField: (formId: number, fieldId: number) =>
    request(http.delete<Result<void>>(`/forms/${formId}/fields/${fieldId}`)),

  // Relationships
  listRelationships: (formId: number) =>
    request(http.get<Result<RelationshipVO[]>>(`/forms/${formId}/relationships`)),

  // Sections (NEW from V5)
  listSections: (formId: number) =>
    request(http.get<Result<SectionVO[]>>(`/forms/${formId}/sections`)),
  createSection: (formId: number, req: CreateSectionRequest) =>
    request(http.post<Result<number>>(`/forms/${formId}/sections`, req)),
  updateSection: (formId: number, sectionId: number, req: UpdateSectionRequest) =>
    request(http.put<Result<void>>(`/forms/${formId}/sections/${sectionId}`, req)),
  deleteSection: (formId: number, sectionId: number) =>
    request(http.delete<Result<void>>(`/forms/${formId}/sections/${sectionId}`)),

  // Business keys
  getBusinessKeys: (formId: number) =>
    request(http.get<Result<FormBusinessKey[]>>(`/forms/${formId}/business-key`)),

  // DB introspection
  listUserTables: () =>
    request(http.get<Result<string[]>>('/admin/db/tables')),
  listTableColumns: (table: string) =>
    request(http.get<Result<ColumnInfo[]>>(`/admin/db/tables/${table}/columns`)),

  // Form records (for preview, not editing)
  getFormRecord: (formId: number, recordId: number) =>
    request(http.get<Result<unknown>>(`/forms/${formId}/records/${recordId}`)),
  listFormRecords: (formId: number, keyword?: string) =>
    request(http.get<Result<unknown>>(`/forms/${formId}/records`, { params: { keyword } })),
};
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/services/designer/designerApi.ts
git commit -m "feat(designer): add designerApi covering all backend endpoints"
```

---

## Task 1.4: designerStore (Zustand)

**Files:**
- Create: `apps/platform-admin/src/services/designer/designerStore.ts`

- [ ] **Step 1: Create designerStore**

```typescript
import { create } from 'zustand';
import type {
  FormFieldDefVO, RelationshipVO, SectionVO, FormBusinessKey,
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

const EMPTY: Partial<DesignerState> = {
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
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/services/designer/designerStore.ts
git commit -m "feat(designer): add designerStore (Zustand) with field/section/subform actions"
```

---

## Task 1.5: Phase 1 verification

- [ ] **Step 1: Full typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm typecheck
```

Expected: All workspaces typecheck clean.

- [ ] **Step 2: Confirm dependencies installed**

```bash
cd /home/cris/dev/safeValidator/frontend
ls node_modules/@dnd-kit 2>/dev/null | head -3
```

Expected: `core`, `sortable`, `utilities`.

**Phase 1 complete.** Proceed to [Part 2: Form List Page](2026-06-26-form-designer-part2-form-list.md).
