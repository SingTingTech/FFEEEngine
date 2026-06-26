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
