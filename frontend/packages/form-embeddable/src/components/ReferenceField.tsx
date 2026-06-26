import { Select, Spin, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useReferenceLookup } from '../hooks/useReferenceLookup';
import type { Endpoints } from '../api/endpoints';

export interface ReferenceFieldProps {
  endpoints: Endpoints;
  referenceFormId: number;
  referenceDisplayField: string;
  storageType: 'bigint' | 'varchar';
  value: number | string | null;
  onChange: (id: number | string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * Smart Select for reference fields.
 * - Trigger shows display value (loaded separately or from selected record)
 * - Stores id (number or string)
 * - Async search via debounced lookup
 */
export function ReferenceField({
  endpoints,
  referenceFormId,
  referenceDisplayField,
  storageType,
  value,
  onChange,
  disabled,
  readOnly,
}: ReferenceFieldProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>('');

  // Load display for currently selected value
  useEffect(() => {
    if (value === null || value === undefined || !open) return;
    if (displayValue) return;
    let cancelled = false;
    (async () => {
      try {
        const rec = await endpoints.getRecord(referenceFormId, value as number);
        if (cancelled) return;
        const data = (rec as any).data ?? {};
        // display value: prefer referenceDisplayField from config, fallback to first text-ish field
        const dv = data[referenceDisplayField] ?? Object.values(data).find((v) => typeof v === 'string') ?? '';
        setDisplayValue(String(dv));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, open, endpoints, referenceFormId, referenceDisplayField, displayValue]);

  const { results } = useReferenceLookup(endpoints, referenceFormId, search, open);
  const data = results.data;

  if (readOnly) {
    return <Input value={displayValue || '—'} disabled />;
  }

  // value for the Select: must be a primitive that matches the option value (string or number)
  const selectValue =
    value === null || value === undefined
      ? undefined
      : storageType === 'bigint'
        ? Number(value)
        : String(value);

  return (
    <Select
      showSearch
      value={selectValue}
      placeholder="输入搜索..."
      disabled={disabled}
      allowClear
      filterOption={false}
      onSearch={setSearch}
      onDropdownVisibleChange={(o) => {
        setOpen(o);
        if (!o) setSearch('');
      }}
      onChange={(v) => {
        if (v === undefined || v === null) {
          setDisplayValue('');
          onChange(null);
        } else {
          const opt = (data?.records ?? []).find((r) => String(r.id) === String(v));
          if (opt) setDisplayValue(opt.display);
          onChange(v);
        }
      }}
      notFoundContent={results.isFetching ? <Spin size="small" /> : '无匹配'}
      options={(data?.records ?? []).map((r) => ({
        value: storageType === 'bigint' ? Number(r.id) : String(r.id),
        label: r.display,
      }))}
      style={{ width: '100%' }}
    />
  );
}