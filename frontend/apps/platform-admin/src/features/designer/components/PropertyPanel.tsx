import { Empty, Form, Input, Select, Switch, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useDesignerStore } from '@/services/designer/designerStore';
import { designerApi } from '@/services/designer/designerApi';
import { ValidationEditor } from './ValidationEditor';
import { FieldTypeIcon } from './FieldTypeIcon';
import type { FormFieldDefVO, ColumnInfo } from '@/types/designer';

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
