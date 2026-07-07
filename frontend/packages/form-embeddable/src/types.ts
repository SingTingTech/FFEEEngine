// Re-export commonly used types from shared-types for convenience
export type {
  FormFieldDefVO,
  SchemaDetailVO,
  FormRecord,
  PageResult,
} from '@safe-validator/shared-types';

// Component-specific types
// Note: ID fields are `string` because the backend serializes Long as String
// to avoid JavaScript Number precision loss. See common/jackson/JacksonConfig.
export interface FormFillerProps {
  // Data source
  formId: string | number;
  apiBase: string;
  token?: string;

  // Mode
  readOnly?: boolean;
  recordId?: string | number;

  // Subform events
  onCreate?: () => void;
  onEdit?: (recordId: string | number) => void;
  onView?: (recordId: string | number) => void;
  onDelete?: (recordId: string | number) => void;

  // Submit callbacks
  onSubmitSuccess?: (recordId: string | number) => void;
  onSubmitError?: (error: Error) => void;
  onCancel?: () => void;

  // Customization
  locale?: 'zh_CN' | 'en_US';
  themeToken?: Record<string, string>;
}

export interface FormListProps {
  // Data source
  formId: string | number;
  apiBase: string;
  token?: string;

  // List config
  pageSize?: number;
  searchableFields?: string[];
  defaultSort?: { field: string; order: 'asc' | 'desc' };

  // Custom columns (optional)
  columns?: Array<{
    title: string;
    dataIndex: string;
    render?: (value: any, record: any) => React.ReactNode;
    width?: number;
  }>;

  // CRUD callbacks
  onCreate?: () => void;
  onView?: (recordId: string | number) => void;
  onEdit?: (recordId: string | number) => void;
  onDelete?: (recordId: string | number) => Promise<void> | void;

  // Customization
  title?: string;
  locale?: 'zh_CN' | 'en_US';
  themeToken?: Record<string, string>;
}

export interface ReferenceOption {
  id: string | number;
  display: string;
}

export interface ChildItem {
  id?: string | number;
  data: Record<string, any>;
}

export interface FormSubmitPayload {
  formId: string | number;
  data: Record<string, any>;
  children?: Array<{
    formId: string | number;
    data: Record<string, any>;
    children?: any[];
  }>;
}
