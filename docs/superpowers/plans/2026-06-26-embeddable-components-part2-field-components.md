# Part 2: FieldRenderer + ReferenceField

**Phase:** 2 of 5
**Tasks:** 2.1 – 2.2
**End state:** Single field components renderable; reference field has async search.

**Working directory:** `/home/cris/dev/safeValidator/frontend/`

---

## Task 2.1: FieldRenderer

**Files:**
- Create: `frontend/packages/form-embeddable/src/components/FieldRenderer.tsx`

- [ ] **Step 1: Create FieldRenderer**

```tsx
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
const { RangePicker } = DatePicker;

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
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable typecheck
git add packages/form-embeddable/src/components/FieldRenderer.tsx
git commit -m "feat(emb): add FieldRenderer dispatching 10 field types"
```

---

## Task 2.2: ReferenceField (smart Select with async search)

**Files:**
- Create: `frontend/packages/form-embeddable/src/components/ReferenceField.tsx`

- [ ] **Step 1: Create ReferenceField**

```tsx
import { Select, Spin, Input } from 'antd';
import { useEffect, useState } from 'react';
import type { ReferenceOption } from '../types';
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
```

- [ ] **Step 2: Add `dayjs` dependency (DateRenderer needs it)**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable add dayjs
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable typecheck
git add packages/form-embeddable/src/components/ReferenceField.tsx packages/form-embeddable/package.json pnpm-lock.yaml
git commit -m "feat(emb): add ReferenceField (smart Select with async search)"
```

**Phase 2 complete.** Proceed to [Part 3: NestedChildren + FormFiller](2026-06-26-embeddable-components-part3-formfiller.md).
