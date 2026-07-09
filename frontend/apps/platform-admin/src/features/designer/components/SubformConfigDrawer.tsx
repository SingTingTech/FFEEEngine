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
    subformRefId: string;
    isList: boolean;
    linkFields: LinkFieldPair[];
    onDelete: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  }) => void;
}

export function SubformConfigDrawer({ open, field, onClose, onSave }: Props) {
  const { message } = App.useApp();
  const formId = useDesignerStore((s) => s.formId);
  // Forms already referenced as subforms by *other* fields in this
  // form are excluded too — otherwise form A could pick form B as a
  // subform while field B in form B already picks form A as its own
  // subform, producing a rendering loop. Direct cycles (pick yourself)
  // is also filtered — a form can't be a subform of itself.
  const { data: parentSchema } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => designerApi.getForm(formId!),
    enabled: !!formId,
  });
  const alreadyLinkedFormIds = new Set(
    (parentSchema?.fields ?? [])
      .filter((f) => f.type === 'subform' && f.id !== field.id)
      .map((f) => (f.config as { subformRefId?: string } | null)?.subformRefId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );

  const initial = (field.config ?? {}) as {
    subformRefId?: string;
    isList?: boolean;
    linkFields?: LinkFieldPair[];
    onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  };

  const [subformRefId, setSubformRefId] = useState<string | undefined>(initial.subformRefId);
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
            // Filter out the form itself and any form that is already
            // referenced as a subform by another field in this same
            // form — picking those creates a render cycle. Currently
            // editing a subform field shows its own existing selection
            // even after the filter, which is fine.
            options={(allForms ?? [])
              .filter((f) => f.formId !== formId && !alreadyLinkedFormIds.has(f.formId))
              .map((f) => ({
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
