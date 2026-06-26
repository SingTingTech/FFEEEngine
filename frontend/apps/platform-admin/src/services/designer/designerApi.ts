import { http, request } from '@/api/http';
import type { Result } from '@safe-validator/shared-types';
import type {
  FormVO, SchemaDetailVO, SchemaVersionVO, FormFieldDefVO,
  RelationshipVO, SectionVO, FormBusinessKey, ColumnInfo,
  CreateFormRequest, CreateFieldRequest,
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