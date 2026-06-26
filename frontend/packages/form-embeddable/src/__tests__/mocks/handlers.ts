import { http, HttpResponse } from 'msw';
import type { SchemaDetailVO, FormRecord } from '../../types';

const sampleSchema: SchemaDetailVO = {
  formId: 42,
  version: 1,
  schemaId: 1,
  name: '订单',
  description: null,
  targetTable: 'orders',
  isCurrent: true,
  createTime: '2026-06-26T00:00:00Z',
  fields: [
    {
      id: 1, schemaId: 1, code: 'customer_name', name: '客户名称', type: 'text',
      required: true, defaultValue: null, sortOrder: 0,
      config: null, validation: { required: true, minLength: 2 }, targetColumn: 'customer_name',
      sectionId: null, isLinkField: false,
      createTime: '', updateTime: '',
    },
    {
      id: 2, schemaId: 1, code: 'total_amount', name: '总金额', type: 'number',
      required: true, defaultValue: null, sortOrder: 1,
      config: null, validation: { required: true, min: 0 }, targetColumn: 'total_amount',
      sectionId: null, isLinkField: false,
      createTime: '', updateTime: '',
    },
  ],
  relationships: [],
  sections: [],
};

const sampleRecord: FormRecord = {
  id: 100, formId: 42, formVersion: 1,
  data: { customer_name: 'ACME', total_amount: 999 },
};

export const handlers = [
  http.get('*/api/forms/42/schema', () =>
    HttpResponse.json({ code: 0, data: sampleSchema, message: 'ok' }),
  ),
  http.get('*/api/forms/42/records/100', () =>
    HttpResponse.json({ code: 0, data: sampleRecord, message: 'ok' }),
  ),
  http.get('*/api/forms/42/records', () =>
    HttpResponse.json({
      code: 0,
      data: { records: [sampleRecord], total: 1, pageNum: 1, pageSize: 20 },
      message: 'ok',
    }),
  ),
  http.post('*/api/forms/42/records', () =>
    HttpResponse.json({ code: 0, data: { id: 200, formId: 42, formVersion: 1, childResults: [] }, message: 'ok' }),
  ),
  http.delete('*/api/forms/42/records/:recordId', () =>
    HttpResponse.json({ code: 0, data: null, message: 'ok' }),
  ),
  http.get('*/api/forms/42/records/lookup', () =>
    HttpResponse.json({
      code: 0,
      data: { records: [{ id: 1, display: 'ACME Corp' }, { id: 2, display: 'Beta Inc' }], total: 2, pageNum: 1, pageSize: 20 },
      message: 'ok',
    }),
  ),
];
