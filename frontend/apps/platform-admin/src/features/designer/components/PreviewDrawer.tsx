import { Drawer, Empty, Form, Input, InputNumber, DatePicker, Switch, Select, Button } from 'antd';
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
