// Public API for the embeddable components package

export { FormFiller } from './components/FormFiller';
export { FormList } from './components/FormList';

export type {
  FormFillerProps,
  FormListProps,
  FormRecord,
  PageResult,
  FormFieldDefVO,
  SchemaDetailVO,
  ReferenceOption,
  ChildItem,
  FormSubmitPayload,
} from './types';

export const FORM_EMBEDDABLE_VERSION = '1.0.0';