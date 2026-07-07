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
    request(http.post<Result<string>>('/forms', req)),
  getForm: (formId: string) =>
    request(http.get<Result<SchemaDetailVO>>(`/forms/${formId}/schema`)),
  getVersions: (formId: string) =>
    request(http.get<Result<SchemaVersionVO[]>>(`/forms/${formId}/versions`)),
  publishNewVersion: (formId: string, req: UpdateSchemaRequest) =>
    request(http.put<Result<string>>(`/forms/${formId}/schema`, req)),
  deleteForm: (formId: string) =>
    request(http.delete<Result<void>>(`/forms/${formId}`)),

  // Fields
  listFields: (formId: string) =>
    request(http.get<Result<FormFieldDefVO[]>>(`/forms/${formId}/fields`)),
  addField: (formId: string, req: CreateFieldRequest) =>
    request(http.post<Result<string>>(`/forms/${formId}/fields`, req)),
  updateField: (formId: string, fieldId: string, req: Partial<CreateFieldRequest>) =>
    request(http.put<Result<void>>(`/forms/${formId}/fields/${fieldId}`, req)),
  deleteField: (formId: string, fieldId: string) =>
    request(http.delete<Result<void>>(`/forms/${formId}/fields/${fieldId}`)),

  // Relationships
  listRelationships: (formId: string) =>
    request(http.get<Result<RelationshipVO[]>>(`/forms/${formId}/relationships`)),

  // Sections (NEW from V5)
  listSections: (formId: string) =>
    request(http.get<Result<SectionVO[]>>(`/forms/${formId}/sections`)),
  createSection: (formId: string, req: CreateSectionRequest) =>
    request(http.post<Result<string>>(`/forms/${formId}/sections`, req)),
  updateSection: (formId: string, sectionId: string, req: UpdateSectionRequest) =>
    request(http.put<Result<void>>(`/forms/${formId}/sections/${sectionId}`, req)),
  deleteSection: (formId: string, sectionId: string) =>
    request(http.delete<Result<void>>(`/forms/${formId}/sections/${sectionId}`)),

  // Business keys
  getBusinessKeys: (formId: string) =>
    request(http.get<Result<FormBusinessKey[]>>(`/forms/${formId}/business-key`)),

  // DB introspection
  listUserTables: () =>
    request(http.get<Result<string[]>>('/admin/db/tables')),
  listTableColumns: (table: string) =>
    request(http.get<Result<ColumnInfo[]>>(`/admin/db/tables/${table}/columns`)),

  // Form records (for preview, not editing)
  getFormRecord: (formId: string, recordId: string) =>
    request(http.get<Result<unknown>>(`/forms/${formId}/records/${recordId}`)),
  listFormRecords: (formId: string, keyword?: string) =>
    request(http.get<Result<unknown>>(`/forms/${formId}/records`, { params: { keyword } })),
};