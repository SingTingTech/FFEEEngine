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