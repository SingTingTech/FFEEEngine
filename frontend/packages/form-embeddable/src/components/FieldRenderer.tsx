import { Input, InputNumber, DatePicker, Switch, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { FormFieldDefVO } from '../types';

export interface FieldRendererProps {
  field: FormFieldDefVO;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

const { TextArea } = Input;

/**
 * Render a single field by type. Read-only when disabled=true.
 * 10 types supported: text, longtext, number, boolean, date, datetime, select, multiselect, file, reference.
 * Subform is NOT rendered here (handled by FormFiller directly).
 */
export function FieldRenderer({ field, value, onChange, disabled }: FieldRendererProps) {
  switch (field.type) {
    case 'text':
      return <Input value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;

    case 'longtext':
      return <TextArea rows={4} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;

    case 'number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={value ?? null}
          disabled={disabled}
          onChange={(v) => onChange(v)}
        />
      );

    case 'boolean':
      return <Switch checked={!!value} disabled={disabled} onChange={onChange} />;

    case 'date':
      return (
        <DatePicker
          style={{ width: '100%' }}
          value={value ? dayjs(value) : null}
          disabled={disabled}
          onChange={(d: Dayjs | null) => onChange(d ? d.format('YYYY-MM-DD') : null)}
        />
      );

    case 'datetime':
      return (
        <DatePicker
          showTime
          style={{ width: '100%' }}
          value={value ? dayjs(value) : null}
          disabled={disabled}
          onChange={(d: Dayjs | null) => onChange(d ? d.toISOString() : null)}
        />
      );

    case 'select':
      return (
        <Select
          value={value ?? undefined}
          disabled={disabled}
          allowClear
          options={getSelectOptions(field)}
          onChange={onChange}
          style={{ width: '100%' }}
        />
      );

    case 'multiselect':
      return (
        <Select
          mode="multiple"
          value={Array.isArray(value) ? value : []}
          disabled={disabled}
          allowClear
          options={getSelectOptions(field)}
          onChange={onChange}
          style={{ width: '100%' }}
        />
      );

    case 'file':
      // MVP: simple Input showing URL/path. Real upload not implemented.
      return <Input value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="文件 URL/路径" />;

    case 'reference':
      // Reference is handled by ReferenceField (separate component for code clarity).
      return null;

    default:
      return <Input value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
}

function getSelectOptions(field: FormFieldDefVO): Array<{ value: string; label: string }> {
  const cfg = (field.config ?? {}) as { options?: Array<{ label: string; value: string | number }> };
  if (Array.isArray(cfg.options)) {
    return cfg.options.map((o) => ({ value: String(o.value), label: String(o.label) }));
  }
  return [];
}