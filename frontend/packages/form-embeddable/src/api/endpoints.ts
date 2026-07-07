// Re-export http layer so consumers can do:
//   import { createHttp, createEndpoints, type Endpoints, type Http } from '../api';
export * from './http';

import type { Http } from './http';
import type {
  SchemaDetailVO,
  FormRecord,
  PageResult,
  ReferenceOption,
} from '../types';

export interface ListParams {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
}

export interface LookupParams {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
}

export function createEndpoints(http: Http) {
  return {
    getSchema: (formId: string | number) => http.get<SchemaDetailVO>(`/api/forms/${formId}/schema`),

    getRecord: (formId: string | number, recordId: string | number) =>
      http.get<FormRecord>(`/api/forms/${formId}/records/${recordId}`),

    listRecords: (formId: string | number, params: ListParams) => {
      const search = new URLSearchParams();
      if (params.pageNum !== undefined) search.set('pageNum', String(params.pageNum));
      if (params.pageSize !== undefined) search.set('pageSize', String(params.pageSize));
      if (params.keyword) search.set('keyword', params.keyword);
      const qs = search.toString();
      return http.get<PageResult<FormRecord>>(`/api/forms/${formId}/records${qs ? `?${qs}` : ''}`);
    },

    submitForm: (formId: string | number, payload: any) =>
      http.post<{ id: number; formId: number; formVersion: number; childResults: any[] }>(
        `/api/forms/${formId}/records`,
        payload,
      ),

    deleteRecord: (formId: string | number, recordId: string | number) =>
      http.delete<void>(`/api/forms/${formId}/records/${recordId}`),

    listChildren: (formId: string | number, recordId: string | number, childFormId: string | number) =>
      http.get<PageResult<FormRecord>>(
        `/api/forms/${formId}/records/${recordId}/children/${childFormId}`,
      ),

    lookupReference: (targetFormId: string | number, keyword: string, params: LookupParams) => {
      const search = new URLSearchParams();
      if (params.pageNum !== undefined) search.set('pageNum', String(params.pageNum));
      if (params.pageSize !== undefined) search.set('pageSize', String(params.pageSize));
      if (keyword) search.set('keyword', keyword);
      const qs = search.toString();
      return http.get<PageResult<ReferenceOption>>(
        `/api/forms/${targetFormId}/records/lookup${qs ? `?${qs}` : ''}`,
      );
    },
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;