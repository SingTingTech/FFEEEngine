import { Button, Select, Table } from 'antd';
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
