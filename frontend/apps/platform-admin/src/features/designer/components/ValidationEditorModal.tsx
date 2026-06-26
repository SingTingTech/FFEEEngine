import { Form, Input, InputNumber, Modal, Switch } from 'antd';
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
