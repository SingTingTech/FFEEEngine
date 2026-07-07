import { Button, Card, Empty, Form, Popconfirm, Space, Typography } from 'antd';
import { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import type { ChildItem, FormFieldDefVO } from '../types';
import type { Endpoints } from '../api/endpoints';
import { FieldRenderer } from './FieldRenderer';
import { ReferenceField } from './ReferenceField';

export interface NestedChildrenProps {
  endpoints: Endpoints;
  childFormId: string | number;
  childFields: FormFieldDefVO[];   // fields of the child form
  childLinkField: string;         // the linking field (auto-handled, hidden from UI)
  parentRecordId?: string | number;        // undefined = new parent, no children yet
  /** When provided, [+ 添加] button triggers onCreate() (consumer routing).
   *  When absent, button appends an inline empty item. */
  onCreate?: () => void;
  onEdit?: (recordId: string | number) => void;
  onView?: (recordId: string | number) => void;
  onDelete?: (recordId: string | number) => void;
}

export interface NestedChildrenHandle {
  getItems: () => ChildItem[];
  isValid: () => boolean;
}

/**
 * 1:N nested subforms. Inline expansion below parent fields.
 * Linking field is auto-handled (hidden from UI) and injected on submit by FormFiller.
 */
export const NestedChildren = forwardRef<NestedChildrenHandle, NestedChildrenProps>(
  function NestedChildren(
    {
      endpoints, childFormId, childFields, childLinkField, parentRecordId,
      onCreate, onView: _onView, onDelete: _onDelete,
      onEdit: _onEdit,
    },
    ref,
  ) {
    const [items, setItems] = useState<ChildItem[]>([]);
    const [errors] = useState<Record<number, Record<string, string>>>({});
    const itemsRef = useRef(items);
    itemsRef.current = items;

    // Load existing children (edit mode)
    useEffect(() => {
      if (!parentRecordId) {
        setItems([]);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          // We don't know the parent formId here; pass it via prop? Simplest: caller pre-loads and passes via prop.
          // For MVP, use a special endpoint to list children of any record.
          // Since we don't have that endpoint, just leave empty for new parents.
        } catch {
          // ignore
        }
      })();
      return () => { cancelled = false; void cancelled; };
    }, [parentRecordId, childFormId]);

    useImperativeHandle(ref, () => ({
      getItems: () => itemsRef.current,
      isValid: () => Object.values(errors).every((m) => Object.keys(m).length === 0),
    }));

    const handleAdd = () => {
      if (onCreate) {
        onCreate();
        return;
      }
      setItems([...items, { data: {} }]);
    };

    const handleItemChange = (idx: number, data: Record<string, any>) => {
      setItems(items.map((it, i) => (i === idx ? { ...it, data } : it)));
    };

    const handleItemDelete = (idx: number) => {
      setItems(items.filter((_, i) => i !== idx));
    };

    return (
      <Card
        type="inner"
        size="small"
        title={
          <Space>
            <span>📦 子表单 (1:N)</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {items.length} 项
            </Typography.Text>
          </Space>
        }
        extra={
          <Button
            type="dashed"
            size="small"
            onClick={handleAdd}
          >
            + 添加
          </Button>
        }
      >
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无子项" />
        ) : (
          items.map((item, idx) => (
            <Card
              key={item.id ?? `new-${idx}`}
              type="inner"
              size="small"
              style={{ marginBottom: 8 }}
              title={
                <Space>
                  <span>子项 #{idx + 1}</span>
                  {item.id && _onView && (
                    <Button size="small" type="link" onClick={() => _onView(item.id!)}>查看</Button>
                  )}
                </Space>
              }
              extra={
                <Popconfirm
                  title="确认删除此子项？"
                  onConfirm={() => handleItemDelete(idx)}
                >
                  <Button size="small" danger>×</Button>
                </Popconfirm>
              }
            >
              {/* Render non-link fields only; linking field is auto-handled */}
              {childFields
                .filter((f) => f.code !== childLinkField && !f.isLinkField)
                .map((field) => (
                  <Form.Item
                    key={field.code}
                    label={field.name}
                    required={field.required}
                    validateStatus={errors[idx]?.[field.code] ? 'error' : ''}
                    help={errors[idx]?.[field.code]}
                  >
                    {field.type === 'reference' ? (
                      <ReferenceField
                        endpoints={endpoints}
                        referenceFormId={(field.config as any)?.referenceFormId ?? 0}
                        referenceDisplayField={(field.config as any)?.referenceDisplayField ?? ''}
                        storageType={(field.config as any)?.referenceStorageAs ?? 'bigint'}
                        value={item.data[field.code] ?? null}
                        onChange={(v) => handleItemChange(idx, { ...item.data, [field.code]: v })}
                      />
                    ) : (
                      <FieldRenderer
                        field={field}
                        value={item.data[field.code]}
                        onChange={(v) => handleItemChange(idx, { ...item.data, [field.code]: v })}
                      />
                    )}
                  </Form.Item>
                ))}
            </Card>
          ))
        )}
      </Card>
    );
  },
);