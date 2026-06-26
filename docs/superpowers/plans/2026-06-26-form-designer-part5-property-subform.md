# Part 5: Property Panel + Subform Config

**Phase:** 5 of 6
**Tasks:** 5.1 – 5.4
**End state:** Type-aware property editing; subform config drawer with multi-link-field editor; validation editor; everything saves to draft store.

**Working directory:** `/home/cris/dev/safeValidator/frontend/apps/platform-admin/`

Reference: design doc §6.5 (PropertyPanel), §7 (SubformConfigDrawer + LinkFieldsEditor), §6.5 ValidationEditor.

---

## Task 5.1: ValidationEditor + ValidationEditorModal

**Files:**
- Create: `src/features/designer/components/ValidationEditor.tsx`
- Create: `src/features/designer/components/ValidationEditorModal.tsx`

- [ ] **Step 1: Create ValidationEditor (collapse + count badge)**

```tsx
import { Badge, Button, Collapse } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { FormFieldDefVO } from '@/types/designer';
import { ValidationEditorModal } from './ValidationEditorModal';

interface Props {
  field: FormFieldDefVO;
  onChange: (validation: Record<string, any>) => void;
}

const RULES_BY_TYPE: Record<string, string[]> = {
  text: ['required', 'minLength', 'maxLength', 'pattern'],
  longtext: ['required', 'minLength', 'maxLength'],
  number: ['required', 'min', 'max', 'integer'],
  date: ['required', 'minDate', 'maxDate'],
  datetime: ['required', 'minDate', 'maxDate'],
  select: ['required', 'inOptions'],
  multiselect: ['required', 'minItems', 'maxItems'],
  boolean: ['required'],
  file: ['required', 'maxSize'],
  reference: ['required', 'referenceExists'],
};

export function ValidationEditor({ field, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rules = RULES_BY_TYPE[field.type] ?? [];
  const count = field.validation ? Object.keys(field.validation).filter((k) => !k.endsWith('Message')).length : 0;

  return (
    <>
      <Collapse size="small" ghost>
        <Collapse.Panel
          header={
            <span>
              <SettingOutlined /> 校验规则 <Badge count={count} showZero={false} />
            </span>
          }
          key="validation"
        >
          <Button size="small" onClick={() => setOpen(true)}>编辑校验</Button>
        </Collapse.Panel>
      </Collapse>
      <ValidationEditorModal
        open={open}
        field={field}
        availableRules={rules}
        onClose={() => setOpen(false)}
        onSave={(validation) => {
          onChange(validation);
          setOpen(false);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Create ValidationEditorModal**

```tsx
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useEffect, useState } from 'react';
import type { FormFieldDefVO } from '@/types/designer';

interface Props {
  open: boolean;
  field: FormFieldDefVO;
  availableRules: string[];
  onClose: () => void;
  onSave: (validation: Record<string, any>) => void;
}

export function ValidationEditorModal({ open, field, availableRules, onClose, onSave }: Props) {
  const [rules, setRules] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) setRules(field.validation ?? {});
  }, [open, field]);

  const renderRuleInput = (ruleName: string) => {
    switch (ruleName) {
      case 'required':
        return (
          <Form.Item key={ruleName} label="必填" valuePropName="checked">
            <Switch />
          </Form.Item>
        );
      case 'minLength':
      case 'maxLength':
      case 'minItems':
      case 'maxItems':
        return (
          <Form.Item key={ruleName} name={ruleName} label={ruleName}>
            <InputNumber min={0} />
          </Form.Item>
        );
      case 'min':
      case 'max':
        return (
          <Form.Item key={ruleName} name={ruleName} label={ruleName}>
            <InputNumber />
          </Form.Item>
        );
      case 'pattern':
        return (
          <Form.Item key={ruleName} name={ruleName} label="正则表达式">
            <Input placeholder="^[A-Za-z0-9]+$" />
          </Form.Item>
        );
      case 'integer':
        return (
          <Form.Item key={ruleName} label="必须为整数" valuePropName="checked">
            <Switch />
          </Form.Item>
        );
      case 'inOptions':
        return (
          <Form.Item key={ruleName} name={ruleName} label="选项（逗号分隔）">
            <Input placeholder="option1, option2, option3" />
          </Form.Item>
        );
      case 'referenceExists':
        return null;
      default:
        return null;
    }
  };

  return (
    <Modal
      title={`编辑校验 - ${field.name}`}
      open={open}
      onCancel={onClose}
      onOk={() => onSave(rules)}
      width={500}
    >
      <Form layout="vertical">
        {availableRules.map((r) => renderRuleInput(r))}
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components/ValidationEditor.tsx apps/platform-admin/src/features/designer/components/ValidationEditorModal.tsx
git commit -m "feat(designer): add ValidationEditor and ValidationEditorModal"
```

---

## Task 5.2: PropertyPanel (type-aware)

**Files:**
- Modify: `src/features/designer/components/PropertyPanel.tsx`

- [ ] **Step 1: Replace PropertyPanel with full type-aware version**

```tsx
import { useState } from 'react';
import { Empty, Form, Input, Select, Switch, Button, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useDesignerStore } from '@/services/designer/designerStore';
import { designerApi } from '@/services/designer/designerApi';
import { ValidationEditor } from './ValidationEditor';
import { FieldTypeIcon } from './FieldTypeIcon';
import type { FormFieldDefVO, ColumnInfo, FormBusinessKey } from '@/types/designer';

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'longtext', label: '长文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'select', label: '单选' },
  { value: 'multiselect', label: '多选' },
  { value: 'file', label: '文件' },
  { value: 'reference', label: '引用' },
];

export function PropertyPanel() {
  const formId = useDesignerStore((s) => s.formId);
  const targetTable = useDesignerStore((s) => s.targetTable);
  const selectedFieldId = useDesignerStore((s) => s.selectedFieldId);
  const fields = useDesignerStore((s) => s.draftFields);
  const updateField = useDesignerStore((s) => s.updateField);
  const sections = useDesignerStore((s) => s.draftSections);
  const setFieldSection = useDesignerStore((s) => s.setFieldSection);

  const selected = fields.find((f) => f.id === selectedFieldId);

  // Load table columns when a field is selected and form has target_table
  const { data: columns } = useQuery({
    queryKey: ['columns', targetTable],
    queryFn: () => designerApi.listTableColumns(targetTable!),
    enabled: !!targetTable && !!selected,
  });

  if (!selected) {
    return (
      <div style={{ padding: 16 }}>
        <Empty description="选中字段查看属性" />
      </div>
    );
  }

  const update = (patch: Partial<FormFieldDefVO>) => updateField(selected.id, patch);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <FieldTypeIcon type={selected.type} />
        <h3 style={{ margin: 0 }}>{selected.name || selected.code}</h3>
        {selected.required && <Tag color="red">必填</Tag>}
        {selected.isLinkField && <Tag color="purple">链接</Tag>}
      </div>

      <Form layout="vertical" size="small">
        <Form.Item label="code">
          <Input value={selected.code} disabled />
        </Form.Item>
        <Form.Item label="显示名">
          <Input
            value={selected.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="类型">
          <Select
            value={selected.type}
            options={FIELD_TYPES}
            onChange={(v) => update({ type: v })}
            disabled={selected.isLinkField}
          />
        </Form.Item>
        <Form.Item label="必填" valuePropName="checked">
          <Switch
            checked={selected.required}
            onChange={(v) => update({ required: v })}
            disabled={selected.isLinkField}
          />
        </Form.Item>

        {/* 分组选择 */}
        <Form.Item label="所属分组">
          <Select
            allowClear
            placeholder="无分组"
            value={selected.sectionId ?? undefined}
            options={sections.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) => setFieldSection(selected.id, v ?? null)}
          />
        </Form.Item>

        {/* target_column: 普通字段 */}
        {targetTable && selected.type !== 'reference' && selected.type !== 'subform' && (
          <Form.Item label="目标列" required>
            <Select
              showSearch
              placeholder="选择列"
              value={selected.targetColumn ?? undefined}
              options={(columns ?? []).map((c: ColumnInfo) => ({
                value: c.name, label: `${c.name} (${c.typeName})`,
              }))}
              onChange={(v) => update({ targetColumn: v })}
            />
          </Form.Item>
        )}

        {/* reference 字段专门配置 */}
        {selected.type === 'reference' && <ReferenceConfig field={selected} onChange={update} />}

        {/* 校验 */}
        <ValidationEditor
          field={selected}
          onChange={(validation) => update({ validation })}
        />
      </Form>
    </div>
  );
}

// Reference field config sub-component
function ReferenceConfig({
  field, onChange,
}: { field: FormFieldDefVO; onChange: (patch: Partial<FormFieldDefVO>) => void }) {
  const config = (field.config ?? {}) as { referenceFormId?: number; referenceDisplayField?: string; referenceStorageAs?: string };
  const { data: allForms } = useQuery({
    queryKey: ['forms-list'],
    queryFn: () => designerApi.listForms(),
  });
  const { data: targetSchema } = useQuery({
    queryKey: ['form', config.referenceFormId],
    queryFn: () => designerApi.getForm(config.referenceFormId!),
    enabled: !!config.referenceFormId,
  });

  return (
    <>
      <Form.Item label="🔗 目标表单">
        <Select
          showSearch
          value={config.referenceFormId}
          options={(allForms ?? []).map((f) => ({ value: f.formId, label: `${f.name} (form ${f.formId})` }))}
          onChange={(v) => onChange({ config: { ...config, referenceFormId: v } })}
        />
      </Form.Item>
      <Form.Item label="显示字段">
        <Select
          value={config.referenceDisplayField}
          options={(targetSchema?.fields ?? []).map((f) => ({ value: f.code, label: `${f.name} (${f.type})` }))}
          onChange={(v) => onChange({ config: { ...config, referenceDisplayField: v } })}
        />
      </Form.Item>
      <Form.Item label="存储为">
        <Select
          value={config.referenceStorageAs ?? 'bigint'}
          options={[{ value: 'bigint', label: 'BIGINT (FK)' }, { value: 'varchar', label: 'VARCHAR' }]}
          onChange={(v) => onChange({ config: { ...config, referenceStorageAs: v } })}
        />
      </Form.Item>
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components/PropertyPanel.tsx
git commit -m "feat(designer): add type-aware PropertyPanel with reference config"
```

---

## Task 5.3: LinkFieldsEditor + SubformConfigDrawer

**Files:**
- Create: `src/features/designer/components/LinkFieldsEditor.tsx`
- Modify: `src/features/designer/components/SubformConfigDrawer.tsx`

- [ ] **Step 1: Create LinkFieldsEditor**

```tsx
import { Button, Select, Space, Table } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { FormFieldDefVO, FormBusinessKey } from '@/types/designer';
import type { LinkFieldPair } from '@/types/designer';

interface Props {
  parentFields: FormFieldDefVO[];
  childFields: FormFieldDefVO[];
  businessKeys: FormBusinessKey[];
  value: LinkFieldPair[];
  onChange: (pairs: LinkFieldPair[]) => void;
}

export function LinkFieldsEditor({
  parentFields, childFields, businessKeys, value, onChange,
}: Props) {
  const businessKeyCodes = new Set(
    businessKeys.map((bk) => parentFields.find((f) => f.id === bk.fieldId)?.code).filter(Boolean)
  );

  const parentOptions = (field: FormFieldDefVO) => ({
    value: field.code,
    label: businessKeyCodes.has(field.code)
      ? `${field.code} (${field.type}) ⭐ 业务主键`
      : `${field.code} (${field.type})`,
  });

  const childOptions = childFields
    .filter((f) => f.isLinkField || value.length === 0)
    .map((f) => ({ value: f.code, label: `${f.code} (${f.type})${f.isLinkField ? ' 🔗' : ''}` }));

  const updatePair = (i: number, patch: Partial<LinkFieldPair>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const addPair = () => {
    onChange([...value, { parent: '', child: '' }]);
  };

  const removePair = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <Table
        size="small"
        rowKey={(_, i) => String(i)}
        pagination={false}
        dataSource={value.map((p, i) => ({ ...p, _idx: i }))}
        columns={[
          {
            title: '父表单字段', dataIndex: 'parent',
            render: (_, record: any) => (
              <Select
                showSearch
                style={{ width: '100%' }}
                value={record.parent || undefined}
                placeholder="选父字段"
                options={parentFields.map(parentOptions)}
                onChange={(v) => updatePair(record._idx, { parent: v })}
              />
            ),
          },
          { title: '↔', width: 40, align: 'center' },
          {
            title: '子表单字段', dataIndex: 'child',
            render: (_, record: any) => (
              <Select
                showSearch
                style={{ width: '100%' }}
                value={record.child || undefined}
                placeholder="选子字段"
                options={childOptions}
                onChange={(v) => updatePair(record._idx, { child: v })}
              />
            ),
          },
          {
            title: '', width: 40,
            render: (_, record: any) => (
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                onClick={() => removePair(record._idx)} />
            ),
          },
        ]}
      />
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addPair} style={{ marginTop: 8 }}>
        添加链接字段对
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Replace SubformConfigDrawer with full version**

```tsx
import { Drawer, Form, Select, Switch, App, Button, Space } from 'antd';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDesignerStore } from '@/services/designer/designerStore';
import { designerApi } from '@/services/designer/designerApi';
import { LinkFieldsEditor } from './LinkFieldsEditor';
import type { FormFieldDefVO, LinkFieldPair, FormBusinessKey } from '@/types/designer';

interface Props {
  open: boolean;
  field: FormFieldDefVO;
  onClose: () => void;
  onSave: (config: {
    subformRefId: number;
    isList: boolean;
    linkFields: LinkFieldPair[];
    onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  }) => void;
}

export function SubformConfigDrawer({ open, field, onClose, onSave }: Props) {
  const { message } = App.useApp();
  const formId = useDesignerStore((s) => s.formId);
  const parentFormId = useDesignerStore((s) => (s as any).formId);   // same as formId (this is the parent)

  const initial = (field.config ?? {}) as {
    subformRefId?: number;
    isList?: boolean;
    linkFields?: LinkFieldPair[];
    onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  };

  const [subformRefId, setSubformRefId] = useState<number | undefined>(initial.subformRefId);
  const [isList, setIsList] = useState<boolean>(initial.isList ?? true);
  const [linkFields, setLinkFields] = useState<LinkFieldPair[]>(initial.linkFields ?? []);
  const [onDelete, setOnDelete] = useState<'CASCADE' | 'SET_NULL' | 'RESTRICT'>(initial.onDelete ?? 'CASCADE');

  useEffect(() => {
    if (open) {
      setSubformRefId(initial.subformRefId);
      setIsList(initial.isList ?? true);
      setLinkFields(initial.linkFields ?? []);
      setOnDelete(initial.onDelete ?? 'CASCADE');
    }
  }, [open]);

  const { data: allForms } = useQuery({
    queryKey: ['forms-list'],
    queryFn: () => designerApi.listForms(),
  });
  const { data: childSchema } = useQuery({
    queryKey: ['form', subformRefId],
    queryFn: () => designerApi.getForm(subformRefId!),
    enabled: !!subformRefId,
  });
  const { data: businessKeys } = useQuery({
    queryKey: ['business-keys', formId],
    queryFn: () => designerApi.getBusinessKeys(formId!),
    enabled: !!formId,
  });

  // Also need parent fields — fetch current form's fields
  const { data: parentSchema } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => designerApi.getForm(formId!),
    enabled: !!formId,
  });

  const handleSave = () => {
    if (!subformRefId) {
      message.error('请选择子表单');
      return;
    }
    onSave({ subformRefId, isList, linkFields, onDelete });
  };

  return (
    <Drawer title="子表单配置" open={open} onClose={onClose} width={760}>
      <Form layout="vertical">
        <Form.Item label="引用表单" required>
          <Select
            showSearch
            value={subformRefId}
            placeholder="选择其他表单作为子表单"
            options={(allForms ?? []).map((f) => ({
              value: f.formId, label: `${f.name} (form ${f.formId})`,
            }))}
            onChange={(v) => { setSubformRefId(v); setLinkFields([]); }}
          />
        </Form.Item>
        <Form.Item label="是否为列表（1:N）">
          <Switch checked={isList} onChange={setIsList} />
          <small style={{ marginLeft: 8, color: '#888' }}>关闭 = 1:1</small>
        </Form.Item>
        <Form.Item label="on_delete">
          <Select
            value={onDelete}
            options={[
              { value: 'CASCADE', label: 'CASCADE — 删父 → 删子' },
              { value: 'SET_NULL', label: 'SET_NULL — 删父 → 子链接字段置空' },
              { value: 'RESTRICT', label: 'RESTRICT — 有子时阻止删父' },
            ]}
            onChange={(v) => setOnDelete(v)}
          />
        </Form.Item>
        {subformRefId && childSchema && parentSchema && (
          <>
            <hr />
            <b>🔗 链接字段映射</b>
            <small style={{ display: 'block', color: '#888', marginBottom: 8 }}>
              父表单字段 ↔ 子表单字段。多对，提交时引擎自动注入。
            </small>
            <LinkFieldsEditor
              parentFields={parentSchema.fields}
              childFields={childSchema.fields}
              businessKeys={(businessKeys as FormBusinessKey[]) ?? []}
              value={linkFields}
              onChange={setLinkFields}
            />
          </>
        )}
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={handleSave}>保存</Button>
          <Button onClick={onClose}>取消</Button>
        </Space>
      </Form>
    </Drawer>
  );
}
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components
git commit -m "feat(designer): add LinkFieldsEditor + full SubformConfigDrawer"
```

---

## Task 5.4: Phase 5 verification

- [ ] **Step 1: Dev server smoke test**

```bash
cd /home/cris/dev/safeValidator/frontend
nohup pnpm dev > /tmp/sv-dev.log 2>&1 &
sleep 8
curl -s -o /dev/null -w "dev: %{http_code}\n" http://localhost:5173
pkill -f vite
```

Expected: 200.

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add -A
git commit -m "chore: phase 5 (property panel + subform config) verified" --allow-empty
```

**Phase 5 complete.** Proceed to [Part 6: Preview + Tests](2026-06-26-form-designer-part6-preview-tests.md).
