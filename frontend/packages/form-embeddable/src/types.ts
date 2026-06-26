// Re-export commonly used types from shared-types for convenience
export type {
  FormFieldDefVO,
  SchemaDetailVO,
  FormRecord,
  PageResult,
} from '@safe-validator/shared-types';

// Component-specific types
export interface FormFillerProps {
  // Data source
  formId: number;
  apiBase: string;
  token?: string;

  // Mode
  readOnly?: boolean;
  recordId?: number;

  // Subform events
  onCreate?: () => void;
  onEdit?: (recordId: number) => void;
  onView?: (recordId: number) => void;
  onDelete?: (recordId: number) => void;

  // Submit callbacks
  onSubmitSuccess?: (recordId: number) => void;
  onSubmitError?: (error: Error) => void;
  onCancel?: () => void;

  // Customization
  locale?: 'zh_CN' | 'en_US';
  themeToken?: Record<string, string>;
}

export interface FormListProps {
  // Data source
  formId: number;
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
  onView?: (recordId: number) => void;
  onEdit?: (recordId: number) => void;
  onDelete?: (recordId: number) => Promise<void> | void;

  // Customization
  title?: string;
  locale?: 'zh_CN' | 'en_US';
  themeToken?: Record<string, string>;
}

// reference field types
export interface ReferenceOption {
  id: number | string;
  display: string;
}

// 1:N subform inline edit item
export interface ChildItem {
  id?: number;
  data: Record<string, any>;
}

// Form data wrapped for the API
export interface FormSubmitPayload {
  formId: number;
  data: Record<string, any>;
  children?: Array<{
    formId: number;
    data: Record<string, any>;
    children?: any[];
  }>;
}