// Mirror of backend DTOs
// Note: all ID fields are `string` because the backend serializes Long as String
// to avoid JavaScript Number precision loss (max safe integer = 2^53 - 1 ≈ 9.007e15).
// MyBatis-Plus ASSIGN_ID produces IDs around 2e18 which would lose the last 3-4 digits.
export interface FormVO {
  id: string;
  formId: string;
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
  schemaId: string;
  formId: string;
  version: number;
  isCurrent: boolean;
  name: string;
  createTime: string;
}

export interface FormFieldDefVO {
  id: string;
  schemaId: string;
  code: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  sortOrder: number;
  config: Record<string, any> | null;
  validation: Record<string, any> | null;
  targetColumn: string | null;
  sectionId: string | null;
  isLinkField: boolean;
  createTime: string;
  updateTime: string;
}

export interface RelationshipVO {
  id: string;
  schemaId: string;
  parentFormId: string;
  childFormId: string;
  relationType: 'ONE_TO_ONE' | 'ONE_TO_MANY';
  parentLinkField: string | null;
  childLinkField: string;
  onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  createTime: string;
}

export interface SectionVO {
  id: string;
  schemaId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createTime: string;
  updateTime: string;
}

export interface SchemaDetailVO {
  formId: string;
  version: number;
  schemaId: string;
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
  targetTable?: string | null;
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
  sectionId?: string;
}

export interface CreateRelationshipRequest {
  parentFormId: string;
  childFormId: string;
  relationType: 'ONE_TO_ONE' | 'ONE_TO_MANY';
  parentLinkField?: string;
  childLinkField: string;
  onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
}

export interface CreateSectionRequest {
  // Client-side id (temp id like "tmp-0" or server id when editing).
  // Backend uses this to remap field.sectionId.
  id?: string;
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
  id: string;
  formId: string;
  fieldId: string;
  keyOrder: number;
}

export interface ColumnInfo {
  name: string;
  jdbcType: number;
  typeName: string;
  nullable: boolean;
  size: number | null;
}

export interface SubformConfig {
  subformRefId: string;
  isList: boolean;
  linkFields: LinkFieldPair[];
  onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
}

export interface LinkFieldPair {
  parent: string;
  child: string;
}
