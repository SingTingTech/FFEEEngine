import { Button, ConfigProvider, Form, Space, Spin, message } from 'antd';
import { useEffect, useState, useRef, useMemo } from 'react';
import zhCN from 'antd/locale/zh_CN';
import type { FormFillerProps, ChildItem, FormFieldDefVO } from '../types';
import type { RelationshipVO, SectionVO } from '@safe-validator/shared-types';
import { createHttp, type Http } from '../api/http';
import { createEndpoints, type Endpoints } from '../api/endpoints';
import { useFormSchema } from '../hooks/useFormSchema';
import { useFormData, useSubmitForm } from '../hooks/useFormData';
import { FieldRenderer } from './FieldRenderer';
import { ReferenceField } from './ReferenceField';
import { NestedChildren } from './NestedChildren';

/**
 * Main filling component. Loads schema, renders all fields (including reference and 1:N nested),
 * validates, and submits. Inline [取消] [保存] buttons at the bottom.
 *
 * readOnly=true disables all interactions.
 */
export function FormFiller(props: FormFillerProps) {
  const {
    formId, apiBase, token, readOnly, recordId,
    onCreate, onEdit, onView, onDelete,
    onSubmitSuccess, onSubmitError, onCancel,
    themeToken,
  } = props;

  const http: Http = useMemo(() => createHttp({ apiBase, token }), [apiBase, token]);
  const endpoints: Endpoints = useMemo(() => createEndpoints(http), [http]);

  const { data: schema, isLoading: schemaLoading } = useFormSchema(endpoints, formId);
  const { data: existingRecord } = useFormData(endpoints, formId, recordId);
  const submitMut = useSubmitForm(endpoints);

  // Local form state (keyed by field code)
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Find 1:N subform relationships (load child fields when schema loads)
  const childForms = useMemo(() => {
    if (!schema) return [];
    return (schema.relationships ?? []).map((rel: RelationshipVO) => ({
      relationshipId: rel.id,
      childFormId: rel.childFormId,
      relationType: rel.relationType,
      childLinkField: rel.childLinkField,
    }));
  }, [schema]);

  // Initialize form data from existing record
  useEffect(() => {
    if (existingRecord) {
      setFormData((existingRecord.data as Record<string, any>) ?? {});
    } else if (!recordId) {
      setFormData({});
    }
  }, [existingRecord, recordId]);

  // Load child field definitions for each relationship
  const [childFieldsMap, setChildFieldsMap] = useState<Record<number, FormFieldDefVO[]>>({});
  useEffect(() => {
    if (!schema) return;
    let cancelled = false;
    (async () => {
      const map: Record<number, FormFieldDefVO[]> = {};
      for (const cf of childForms) {
        try {
          const childSchema = await endpoints.getSchema(cf.childFormId);
          if (cancelled) return;
          map[cf.childFormId] = childSchema.fields ?? [];
        } catch {
          // ignore
        }
      }
      if (!cancelled) setChildFieldsMap(map);
    })();
    return () => { cancelled = false; void cancelled; };
  }, [schema, endpoints, childForms]);

  const updateField = (code: string, value: any) => {
    setFormData((prev) => ({ ...prev, [code]: value }));
    setErrors((prev) => {
      if (!prev[code]) return prev;
      const { [code]: _removed, ...rest } = prev;
      return rest;
    });
  };

  // Basic client-side validation (required + minLength for text)
  const validate = (): Record<string, string> => {
    if (!schema) return {};
    const out: Record<string, string> = {};
    for (const f of schema.fields ?? []) {
      if (f.isLinkField) continue;
      const v = formData[f.code];
      const validation = (f.validation ?? {}) as Record<string, any>;
      if (validation.required && (v === undefined || v === null || v === '')) {
        out[f.code] = `${f.name}不能为空`;
        continue;
      }
      if (f.type === 'text' || f.type === 'longtext') {
        if (typeof v === 'string') {
          if (validation.minLength && v.length < validation.minLength) {
            out[f.code] = `长度不能小于${validation.minLength}`;
            continue;
          }
          if (validation.maxLength && v.length > validation.maxLength) {
            out[f.code] = `长度不能超过${validation.maxLength}`;
            continue;
          }
        }
      }
    }
    return out;
  };

  const childrenRefs = useRef<Record<number, any>>({});

  const handleSubmit = async () => {
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      message.error('表单校验失败');
      return;
    }
    setErrors({});

    // Collect children data
    // Build proper children array (per sub-project 2 API: children is Array<{formId, data, children?}>)
    const children = childForms.flatMap((cf: { childFormId: number }) => {
      const ref = childrenRefs.current[cf.childFormId];
      if (!ref) return [];
      const items: ChildItem[] = ref.getItems();
      return items.map((it) => ({ formId: cf.childFormId, data: it.data }));
    });

    const payload = {
      formId,
      data: formData,
      children: children.length > 0 ? children : undefined,
    };

    try {
      const result = await submitMut.mutateAsync({ formId, payload: { data: payload.data, children: payload.children } });
      onSubmitSuccess?.(result.id);
    } catch (e) {
      const err = e as Error;
      message.error(err.message || '提交失败');
      onSubmitError?.(err);
    }
  };

  if (schemaLoading || !schema) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Separate fields by section for layout
  const sections = schema.sections ?? [];
  const fields = schema.fields ?? [];
  const rootFields = fields.filter((f: FormFieldDefVO) => !f.sectionId);
  const sectionFieldMap = new Map<number, FormFieldDefVO[]>();
  for (const s of sections) sectionFieldMap.set(s.id, []);
  for (const f of fields) {
    if (f.sectionId) {
      const arr = sectionFieldMap.get(f.sectionId);
      if (arr) arr.push(f);
    }
  }

  return (
    <ConfigProvider locale={zhCN} theme={themeToken ? { token: themeToken } : undefined}>
      <div style={{ padding: 16 }}>
        <Form layout="vertical" disabled={readOnly}>
          {sections.map((sec: SectionVO) => (
            <fieldset key={sec.id} style={{ border: '1px solid #f0f0f0', padding: 12, marginBottom: 16, borderRadius: 4 }}>
              <legend style={{ padding: '0 8px', fontWeight: 'bold' }}>{sec.name}</legend>
              {(sectionFieldMap.get(sec.id) ?? [])
                .filter((f: FormFieldDefVO) => !f.isLinkField && f.type !== 'subform')
                .map((f: FormFieldDefVO) => renderField(f))}
            </fieldset>
          ))}
          {rootFields
            .filter((f: FormFieldDefVO) => !f.isLinkField && f.type !== 'subform')
            .map((f: FormFieldDefVO) => renderField(f))}

          {/* 1:N subforms at the bottom */}
          {childForms.map((cf: { childFormId: number; childLinkField: string }) => (
            <div key={cf.childFormId} style={{ marginTop: 16 }}>
              <NestedChildren
                ref={(r) => { if (r) childrenRefs.current[cf.childFormId] = r; }}
                endpoints={endpoints}
                childFormId={cf.childFormId}
                childFields={childFieldsMap[cf.childFormId] ?? []}
                childLinkField={cf.childLinkField}
                parentRecordId={recordId}
                onCreate={onCreate}
                onEdit={onEdit}
                onView={onView}
                onDelete={onDelete}
              />
            </div>
          ))}

          {!readOnly && (
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                {onCancel && <Button onClick={onCancel}>取消</Button>}
                <Button
                  type="primary"
                  loading={submitMut.isPending}
                  onClick={handleSubmit}
                >
                  保存
                </Button>
              </Space>
            </div>
          )}
        </Form>
      </div>
    </ConfigProvider>
  );

  function renderField(f: FormFieldDefVO) {
    return (
      <Form.Item
        key={f.code}
        label={f.name}
        required={f.required}
        validateStatus={errors[f.code] ? 'error' : ''}
        help={errors[f.code]}
      >
        {f.type === 'reference' ? (
          <ReferenceField
            endpoints={endpoints}
            referenceFormId={(f.config as any)?.referenceFormId ?? 0}
            referenceDisplayField={(f.config as any)?.referenceDisplayField ?? ''}
            storageType={(f.config as any)?.referenceStorageAs ?? 'bigint'}
            value={formData[f.code] ?? null}
            onChange={(v) => updateField(f.code, v)}
            readOnly={readOnly}
          />
        ) : (
          <FieldRenderer
            field={f}
            value={formData[f.code]}
            onChange={(v) => updateField(f.code, v)}
            disabled={readOnly}
          />
        )}
      </Form.Item>
    );
  }
}