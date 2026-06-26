# Part 6: Preview + Tests

**Phase:** 6 of 6
**Tasks:** 6.1 – 6.4
**End state:** Preview drawer shows read-only form; unit tests for store + dndHelpers pass; E2E smoke test verifies full designer flow.

**Working directory:** `/home/cris/dev/safeValidator/frontend/apps/platform-admin/`

---

## Task 6.1: PreviewDrawer (real implementation)

**Files:**
- Modify: `src/features/designer/components/PreviewDrawer.tsx`

- [ ] **Step 1: Replace PreviewDrawer with real implementation**

```tsx
import { Drawer, Empty, Form, Input, InputNumber, DatePicker, Switch, Select, Button, Space, Tag } from 'antd';
import { useDesignerStore } from '@/services/designer/designerStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PreviewDrawer({ open, onClose }: Props) {
  const formName = useDesignerStore((s) => s.formName);
  const fields = useDesignerStore((s) => s.draftFields);
  const sections = useDesignerStore((s) => s.draftSections);

  // Build form structure: sections wrap their fields, link fields are hidden
  const rootFields = fields.filter((f) => !f.sectionId && !f.isLinkField && f.type !== 'subform');
  const sectionMap = sections.map((s) => ({
    ...s,
    fields: fields.filter((f) => f.sectionId === s.id && !f.isLinkField),
  }));

  return (
    <Drawer title={`预览 - ${formName} (只读)`} open={open} onClose={onClose} width="60%">
      {fields.length === 0 ? (
        <Empty description="无字段可预览" />
      ) : (
        <Form layout="vertical" disabled>
          {sectionMap.map((sec) => (
            <fieldset key={sec.id} style={{ border: '1px solid #f0f0f0', padding: 12, marginBottom: 16, borderRadius: 4 }}>
              <legend style={{ padding: '0 8px', fontWeight: 'bold' }}>{sec.name}</legend>
              {sec.fields.map((f) => renderPreviewField(f))}
            </fieldset>
          ))}
          {rootFields.length > 0 && <div style={{ marginTop: 16 }}>{rootFields.map((f) => renderPreviewField(f))}</div>}
        </Form>
      )}
    </Drawer>
  );
}

function renderPreviewField(f: ReturnType<typeof useDesignerStore.getState>['draftFields'][number]) {
  const label = (
    <span>
      {f.name}
      {f.required && <span style={{ color: 'red' }}> *</span>}
    </span>
  );
  switch (f.type) {
    case 'text':
    case 'longtext':
      return f.type === 'longtext' ? (
        <Form.Item key={f.id} label={label}><Input.TextArea rows={3} /></Form.Item>
      ) : (
        <Form.Item key={f.id} label={label}><Input /></Form.Item>
      );
    case 'number':
      return <Form.Item key={f.id} label={label}><InputNumber style={{ width: '100%' }} /></Form.Item>;
    case 'boolean':
      return <Form.Item key={f.id} label={label} valuePropName="checked"><Switch /></Form.Item>;
    case 'date':
      return <Form.Item key={f.id} label={label}><DatePicker style={{ width: '100%' }} /></Form.Item>;
    case 'datetime':
      return <Form.Item key={f.id} label={label}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>;
    case 'select':
      return (
        <Form.Item key={f.id} label={label}>
          <Select options={[]} placeholder="(配置 options 后可见)" />
        </Form.Item>
      );
    case 'multiselect':
      return (
        <Form.Item key={f.id} label={label}>
          <Select mode="multiple" options={[]} />
        </Form.Item>
      );
    case 'reference':
      return (
        <Form.Item key={f.id} label={label}>
          <Input placeholder="(reference field — 点击查找)" />
          <Button size="small" type="link">查找</Button>
        </Form.Item>
      );
    default:
      return <Form.Item key={f.id} label={label}><Input /></Form.Item>;
  }
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components/PreviewDrawer.tsx
git commit -m "feat(designer): add real PreviewDrawer with read-only form rendering"
```

---

## Task 6.2: Unit tests for designerStore

**Files:**
- Create: `apps/platform-admin/src/services/designer/designerStore.test.ts`

- [ ] **Step 1: Add Vitest if not present**

Verify vitest is configured (sub-project 1 phase 6 added it to platform-admin). If not:

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin add -D vitest @testing-library/react
```

- [ ] **Step 2: Create designerStore test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignerStore } from './designerStore';
import type { FormFieldDefVO, SectionVO } from '@/types/designer';

const sampleField = (overrides: Partial<FormFieldDefVO> = {}): FormFieldDefVO => ({
  id: 1, schemaId: 100, code: 'f1', name: '字段1', type: 'text',
  required: false, defaultValue: null, sortOrder: 0,
  config: null, validation: null, targetColumn: null, sectionId: null, isLinkField: false,
  createTime: '2026-06-26', updateTime: '2026-06-26',
  ...overrides,
});

const sampleSection = (overrides: Partial<SectionVO> = {}): SectionVO => ({
  id: 10, schemaId: 100, name: '基本信息', description: null, sortOrder: 0,
  createTime: '2026-06-26', updateTime: '2026-06-26',
  ...overrides,
});

describe('designerStore', () => {
  beforeEach(() => {
    useDesignerStore.getState().reset();
  });

  it('loadSchema populates state', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: '订单', targetTable: 'orders',
      version: 1, isCurrent: true, fields: [sampleField()], sections: [],
      relationships: [],
    });
    const state = useDesignerStore.getState();
    expect(state.formId).toBe(1);
    expect(state.draftFields).toHaveLength(1);
    expect(state.isDirty).toBe(false);
  });

  it('addField appends new field and marks dirty', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [], sections: [], relationships: [],
    });
    useDesignerStore.getState().addField('text');
    const state = useDesignerStore.getState();
    expect(state.draftFields).toHaveLength(1);
    expect(state.draftFields[0].type).toBe('text');
    expect(state.isDirty).toBe(true);
  });

  it('addField inserts at specified index', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField({ id: 1 }), sampleField({ id: 2 })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().addField('number', 1);
    const state = useDesignerStore.getState();
    expect(state.draftFields).toHaveLength(3);
    expect(state.draftFields[1].type).toBe('number');
  });

  it('updateField patches matching field', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField()], sections: [], relationships: [],
    });
    useDesignerStore.getState().updateField(1, { name: '新名' });
    expect(useDesignerStore.getState().draftFields[0].name).toBe('新名');
  });

  it('removeField deletes and clears selection', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField()], sections: [], relationships: [],
    });
    useDesignerStore.getState().selectField(1);
    useDesignerStore.getState().removeField(1);
    expect(useDesignerStore.getState().draftFields).toHaveLength(0);
    expect(useDesignerStore.getState().selectedFieldId).toBeNull();
  });

  it('reorderFields respects new order', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: 1 }), sampleField({ id: 2 }), sampleField({ id: 3 })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().reorderFields([3, 1, 2]);
    const ids = useDesignerStore.getState().draftFields.map((f) => f.id);
    expect(ids).toEqual([3, 1, 2]);
  });

  it('addSection creates new section', () => {
    useDesignerStore.getState().addSection('分组A');
    expect(useDesignerStore.getState().draftSections).toHaveLength(1);
    expect(useDesignerStore.getState().draftSections[0].name).toBe('分组A');
  });

  it('setFieldSection assigns and clears', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField()], sections: [sampleSection()], relationships: [],
    });
    useDesignerStore.getState().setFieldSection(1, 10);
    expect(useDesignerStore.getState().draftFields[0].sectionId).toBe(10);
    useDesignerStore.getState().setFieldSection(1, null);
    expect(useDesignerStore.getState().draftFields[0].sectionId).toBeNull();
  });

  it('updateSubformConfig sets config', () => {
    useDesignerStore.getState().loadSchema({
      formId: 1, schemaId: 100, formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [sampleField()], sections: [], relationships: [],
    });
    useDesignerStore.getState().updateSubformConfig(1, {
      subformRefId: 99, isList: true, linkFields: [{ parent: 'a', child: 'b' }],
      onDelete: 'CASCADE',
    });
    expect(useDesignerStore.getState().draftFields[0].config).toMatchObject({
      subformRefId: 99, isList: true,
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test --run designerStore
```

Expected: all 9 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add apps/platform-admin/src/services/designer/designerStore.test.ts
git commit -m "test(designer): add 9 unit tests for designerStore"
```

---

## Task 6.3: Unit tests for dndHelpers

**Files:**
- Create: `apps/platform-admin/src/services/designer/dndHelpers.test.ts`

- [ ] **Step 1: Create dndHelpers test**

```typescript
import { describe, it, expect } from 'vitest';
import {
  libraryItemId, canvasItemId, canvasSectionId,
  isLibraryDrag, isCanvasDrag, getInsertIndex,
} from './dndHelpers';

describe('dndHelpers', () => {
  it('libraryItemId / canvasItemId format', () => {
    expect(libraryItemId('text')).toBe('library-text');
    expect(canvasItemId(42)).toBe('canvas-field-42');
    expect(canvasSectionId(7)).toBe('canvas-section-7');
  });

  it('isLibraryDrag identifies library drags', () => {
    expect(isLibraryDrag('library-text')).toEqual({ type: 'text' });
    expect(isLibraryDrag('canvas-field-1')).toBeNull();
    expect(isLibraryDrag('garbage')).toBeNull();
  });

  it('isCanvasDrag extracts field id (including negative temp ids)', () => {
    expect(isCanvasDrag('canvas-field-42')).toBe(42);
    expect(isCanvasDrag('canvas-field--1')).toBe(-1);
    expect(isCanvasDrag('library-text')).toBeNull();
  });

  it('getInsertIndex returns field position or end', () => {
    const fields = [{ id: 1 }, { id: 2 }, { id: 3 }] as any;
    expect(getInsertIndex('canvas-field-2', fields)).toBe(1);
    expect(getInsertIndex('garbage', fields)).toBe(fields.length);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test --run dndHelpers
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add apps/platform-admin/src/services/designer/dndHelpers.test.ts
git commit -m "test(designer): add unit tests for dndHelpers"
```

---

## Task 6.4: E2E smoke test (full designer flow)

**Files:**
- Create: `apps/platform-admin/src/features/designer/__tests__/designerFlow.test.tsx`

- [ ] **Step 1: Add MSW for backend mocking**

If not already added:

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin add -D msw
```

Create `apps/platform-admin/src/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';
import type { SchemaDetailVO, FormVO } from '@/types/designer';

const sampleForm: FormVO = {
  id: 100, formId: 100, version: 1, name: '订单',
  description: 'demo', status: 1, targetTable: 'orders', isCurrent: true,
  createTime: '2026-06-26', updateTime: '2026-06-26',
};

const sampleSchema: SchemaDetailVO = {
  formId: 100, version: 1, schemaId: 100, name: '订单',
  description: 'demo', targetTable: 'orders', isCurrent: true,
  createTime: '2026-06-26',
  fields: [],
  relationships: [],
  sections: [],
};

export const handlers = [
  http.get('/api/forms', () => HttpResponse.json({ code: 0, data: [sampleForm], message: 'ok' })),
  http.get('/api/forms/100/schema', () => HttpResponse.json({ code: 0, data: sampleSchema, message: 'ok' })),
  http.put('/api/forms/100/schema', () => HttpResponse.json({ code: 0, data: 101, message: 'ok' })),
];
```

Create `apps/platform-admin/src/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

- [ ] **Step 2: Create E2E test**

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { server } from '@/mocks/server';
import FormListPage from '@/pages/Designer/FormListPage';

beforeAll(() => server.listen());
afterAll(() => server.close());
beforeEach(() => server.resetHandlers());

const renderWithProviders = (component: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConfigProvider>
        <AntdApp>
          <BrowserRouter>{component}</BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

describe('Designer E2E', () => {
  it('lists forms from /api/forms', async () => {
    renderWithProviders(<FormListPage />);
    await waitFor(() => {
      expect(screen.getByText('订单')).toBeInTheDocument();
    });
  });

  it('shows create form button', async () => {
    renderWithProviders(<FormListPage />);
    expect(screen.getByText('新建表单')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run E2E test**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test --run designerFlow
```

Expected: 2 tests pass.

- [ ] **Step 4: Run all designer tests**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test --run
```

Expected: all designer tests pass (designerStore: 9, dndHelpers: 4, designerFlow: 2 = 15 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add apps/platform-admin/src
git commit -m "test(designer): add E2E smoke test with MSW for designer flow"
```

---

## Phase 6 + Sub-project 3 Final Verification

- [ ] **Step 1: Full typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm typecheck
```

Expected: all 3 workspace packages typecheck clean.

- [ ] **Step 2: Full test suite**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm -r test --run
```

Expected: all designer + existing admin + existing form tests pass.

- [ ] **Step 3: Dev server smoke**

```bash
cd /home/cris/dev/safeValidator/frontend
nohup pnpm dev > /tmp/sv-dev.log 2>&1 &
sleep 8
# Hit a designer endpoint via the Vite proxy
curl -s -o /dev/null -w "dev: %{http_code}\n" http://localhost:5173/designer
pkill -f vite
```

Expected: 200 (SPA loads; route will resolve client-side).

- [ ] **Step 4: Commit final state**

```bash
cd /home/cris/dev/safeValidator/frontend
git add -A
git commit -m "chore: sub-project 3 (form designer) complete and verified" --allow-empty
```

- [ ] **Step 5: Final summary**

```bash
echo "=== Frontend commits in this sub-project ==="
git log --oneline | head -20

echo "=== Designer files ==="
find apps/platform-admin/src/features/designer apps/platform-admin/src/services/designer apps/platform-admin/src/pages/Designer apps/platform-admin/src/types/designer.ts -type f 2>/dev/null | wc -l
echo "designer source files"
```

---

## All Phases Complete

**Sub-project 3 (Form Designer UI) is done.**

**What's working:**
- 顶级菜单"📋 表单设计器"visible in admin
- Form list page (search, create, delete, edit)
- Designer page (3-pane layout)
- Component library (6 categories, 10 fields + 2 containers)
- Click-to-add and drag-to-add from library
- Drag-to-insert and drag-to-reorder on canvas
- CanvasField / CanvasSection / SubformContainer render properly
- Type-aware PropertyPanel (普通字段 / reference / subform)
- Subform config drawer with multi-link-field editor
- Validation editor (per-type applicable rules)
- Real Preview drawer (read-only)
- 15 unit + E2E tests pass

**Backend extension delivered (Phase 0):**
- V5 migration: form_section table + form_field_def.section_id
- 4 new sections APIs (CRUD)
- CreateFieldRequest + FormFieldDefVO + FormFieldDef entity + FormSchemaService updated
- SchemaDetailVO + UpdateSchemaRequest now include sections
- SECTION_NOT_FOUND error code

**Ready for**: Sub-project 4 (Embeddable Components).
