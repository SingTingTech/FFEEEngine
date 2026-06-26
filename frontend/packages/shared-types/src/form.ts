// Shared form schema + record DTO shapes.
// Mirror the backend Java records defined in sub-project 2
// (FormFieldDefVO, SchemaDetailVO, FormRecord).
// Kept intentionally minimal here — Phase 1 only consumes the names;
// later phases (sub-project 2 + 4) may extend field shapes.

export interface FormFieldDefVO {
  id: number;
  schemaId: number;
  code: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string | null;
  sortOrder: number;
  config?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  targetColumn?: string | null;
  sectionId?: number | null;
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

export interface FormRecord {
  id: number;
  formId: number;
  formVersion: number;
  data: Record<string, unknown>;
  children?: FormRecord[];
}