# Part 1: Foundation (package config + types + API + hooks)

**Phase:** 1 of 5
**Tasks:** 1.1 – 1.4
**End state:** Package config in place; public types defined; API client works; 4 internal hooks functional.

**Working directory:** `/home/cris/dev/safeValidator/`

The frontend is a separate git repo. Commit in `frontend/`.

---

## Task 1.1: Package config + tsconfig

**Files:**
- Replace: `frontend/packages/form-embeddable/package.json`
- Create: `frontend/packages/form-embeddable/tsconfig.json`
- Create: `frontend/packages/form-embeddable/vite.config.ts`

- [ ] **Step 1: Replace package.json**

```json
{
  "name": "@safe-validator/form-embeddable",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "antd": "^5.21.0"
  },
  "dependencies": {
    "@safe-validator/shared-types": "workspace:*",
    "@tanstack/react-query": "^5.59.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "msw": "^2.6.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "@types/node": "^20.11.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create vite.config.ts (build config only, MVP doesn't bundle)**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

- [ ] **Step 4: Install dependencies (pnpm workspace adds to lockfile)**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm install
```

- [ ] **Step 5: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add packages/form-embeddable/package.json packages/form-embeddable/tsconfig.json packages/form-embeddable/vite.config.ts pnpm-lock.yaml
git commit -m "feat(emb): add package config + tsconfig + vite config"
```

---

## Task 1.2: Public types + replace placeholder index.ts

**Files:**
- Create: `frontend/packages/form-embeddable/src/types.ts`
- Replace: `frontend/packages/form-embeddable/src/index.ts`

- [ ] **Step 1: Create types.ts**

```typescript
import type {
  FormFieldDefVO,
  SchemaDetailVO,
  FormRecord,
  PageResult,
} from '@safe-validator/shared-types';

// Re-export commonly used types from shared-types for convenience
export type {
  FormFieldDefVO,
  SchemaDetailVO,
  FormRecord,
  PageResult,
} from '@safe-validator/shared-types';

// Component-specific types
export interface FormFillerProps {
  // Data source
  formId: number;
  apiBase: string;
  token?: string;

  // Mode
  readOnly?: boolean;
  recordId?: number;

  // Subform events
  onCreate?: () => void;
  onEdit?: (recordId: number) => void;
  onView?: (recordId: number) => void;
  onDelete?: (recordId: number) => void;

  // Submit callbacks
  onSubmitSuccess?: (recordId: number) => void;
  onSubmitError?: (error: Error) => void;
  onCancel?: () => void;

  // Customization
  locale?: 'zh_CN' | 'en_US';
  themeToken?: Record<string, string>;
}

export interface FormListProps {
  // Data source
  formId: number;
  apiBase: string;
  token?: string;

  // List config
  pageSize?: number;
  searchableFields?: string[];
  defaultSort?: { field: string; order: 'asc' | 'desc' };

  // Custom columns (optional)
  columns?: Array<{
    title: string;
    dataIndex: string;
    render?: (value: any, record: any) => React.ReactNode;
    width?: number;
  }>;

  // CRUD callbacks
  onCreate?: () => void;
  onView?: (recordId: number) => void;
  onEdit?: (recordId: number) => void;
  onDelete?: (recordId: number) => Promise<void> | void;

  // Customization
  title?: string;
  locale?: 'zh_CN' | 'en_US';
}

// reference field types
export interface ReferenceOption {
  id: number | string;
  display: string;
}

// 1:N subform inline edit item
export interface ChildItem {
  id?: number;
  data: Record<string, any>;
}

// Form data wrapped for the API
export interface FormSubmitPayload {
  formId: number;
  data: Record<string, any>;
  children?: Array<{
    formId: number;
    data: Record<string, any>;
    children?: any[];
  }>;
}
```

- [ ] **Step 2: Replace index.ts (replaces the sub-project 1 placeholder)**

```typescript
// Public API for the embeddable components package

export { FormFiller } from './components/FormFiller';
export { FormList } from './components/FormList';

export type {
  FormFillerProps,
  FormListProps,
  FormRecord,
  PageResult,
  FormFieldDefVO,
  SchemaDetailVO,
  ReferenceOption,
  ChildItem,
  FormSubmitPayload,
} from './types';

export const FORM_EMBEDDABLE_VERSION = '1.0.0';
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable typecheck
git add packages/form-embeddable/src/types.ts packages/form-embeddable/src/index.ts
git commit -m "feat(emb): add public types + replace placeholder index.ts"
```

---

## Task 1.3: API layer (http + endpoints)

**Files:**
- Create: `frontend/packages/form-embeddable/src/api/http.ts`
- Create: `frontend/packages/form-embeddable/src/api/endpoints.ts`

- [ ] **Step 1: Create http.ts**

```typescript
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface HttpOptions {
  apiBase: string;
  token?: string;
}

export function createHttp(opts: HttpOptions) {
  const { apiBase, token } = opts;

  async function request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${apiBase.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let data: any = null;
      try { data = await res.json(); } catch { /* ignore */ }
      const message = data?.message ?? `HTTP ${res.status}`;
      throw new ApiError(message, res.status, data);
    }

    const json = await res.json();
    // Unwrap Result<T> envelope: { code, message, data }
    if (json && typeof json === 'object' && 'code' in json) {
      if (json.code !== 0) {
        throw new ApiError(json.message ?? `Error code ${json.code}`, res.status, json);
      }
      return json.data as T;
    }
    return json as T;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: any) => request<T>('POST', path, body),
    put: <T>(path: string, body?: any) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
}

export type Http = ReturnType<typeof createHttp>;
```

- [ ] **Step 2: Create endpoints.ts**

```typescript
import type { Http } from './http';
import type {
  FormFieldDefVO,
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
    getSchema: (formId: number) => http.get<SchemaDetailVO>(`/api/forms/${formId}/schema`),

    getRecord: (formId: number, recordId: number) =>
      http.get<FormRecord>(`/api/forms/${formId}/records/${recordId}`),

    listRecords: (formId: number, params: ListParams) => {
      const search = new URLSearchParams();
      if (params.pageNum !== undefined) search.set('pageNum', String(params.pageNum));
      if (params.pageSize !== undefined) search.set('pageSize', String(params.pageSize));
      if (params.keyword) search.set('keyword', params.keyword);
      const qs = search.toString();
      return http.get<PageResult<FormRecord>>(`/api/forms/${formId}/records${qs ? `?${qs}` : ''}`);
    },

    submitForm: (formId: number, payload: any) =>
      http.post<{ id: number; formId: number; formVersion: number; childResults: any[] }>(
        `/api/forms/${formId}/records`,
        payload,
      ),

    deleteRecord: (formId: number, recordId: number) =>
      http.delete<void>(`/api/forms/${formId}/records/${recordId}`),

    listChildren: (formId: number, recordId: number, childFormId: number) =>
      http.get<PageResult<FormRecord>>(
        `/api/forms/${formId}/records/${recordId}/children/${childFormId}`,
      ),

    lookupReference: (targetFormId: number, keyword: string, params: LookupParams) => {
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
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable typecheck
git add packages/form-embeddable/src/api
git commit -m "feat(emb): add http + endpoints API client"
```

---

## Task 1.4: Four internal hooks

**Files:**
- Create: `frontend/packages/form-embeddable/src/hooks/useFormSchema.ts`
- Create: `frontend/packages/form-embeddable/src/hooks/useFormData.ts`
- Create: `frontend/packages/form-embeddable/src/hooks/useFormList.ts`
- Create: `frontend/packages/form-embeddable/src/hooks/useReferenceLookup.ts`

- [ ] **Step 1: useFormSchema.ts**

```typescript
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SchemaDetailVO } from '../types';
import type { Endpoints } from '../api/endpoints';

export function useFormSchema(
  endpoints: Endpoints,
  formId: number,
  options?: { enabled?: boolean },
): UseQueryResult<SchemaDetailVO> {
  return useQuery({
    queryKey: ['form-schema', formId],
    queryFn: () => endpoints.getSchema(formId),
    enabled: options?.enabled ?? !!formId,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: useFormData.ts**

```typescript
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { FormRecord, FormSubmitPayload } from '../types';
import type { Endpoints } from '../api/endpoints';

export function useFormData(
  endpoints: Endpoints,
  formId: number,
  recordId: number | undefined,
): UseQueryResult<FormRecord> {
  return useQuery({
    queryKey: ['form-record', formId, recordId],
    queryFn: () => endpoints.getRecord(formId, recordId!),
    enabled: !!recordId,
  });
}

export interface SubmitVariables {
  formId: number;
  payload: Omit<FormSubmitPayload, 'formId'>;
}

export function useSubmitForm(endpoints: Endpoints) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, payload }: SubmitVariables) =>
      endpoints.submitForm(formId, payload),
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: ['form-record', variables.formId] });
      qc.invalidateQueries({ queryKey: ['form-records', variables.formId] });
    },
  });
}
```

- [ ] **Step 3: useFormList.ts**

```typescript
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { FormRecord, PageResult } from '../types';
import type { Endpoints, ListParams } from '../api/endpoints';

export function useFormList(
  endpoints: Endpoints,
  formId: number,
  params: ListParams = { pageNum: 1, pageSize: 20 },
): UseQueryResult<PageResult<FormRecord>> {
  return useQuery({
    queryKey: ['form-records', formId, params],
    queryFn: () => endpoints.listRecords(formId, params),
    enabled: !!formId,
  });
}
```

- [ ] **Step 4: useReferenceLookup.ts**

```typescript
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReferenceOption, PageResult } from '../types';
import type { Endpoints } from '../api/endpoints';

export function useReferenceLookup(
  endpoints: Endpoints,
  targetFormId: number,
  keyword: string,
  open: boolean,
  debounceMs: number = 300,
): { results: UseQueryResult<PageResult<ReferenceOption>>; debouncedKeyword: string } {
  const [debouncedKeyword, setDebounced] = useState(keyword);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword), debounceMs);
    return () => clearTimeout(t);
  }, [keyword, debounceMs]);

  const results = useQuery({
    queryKey: ['ref-lookup', targetFormId, debouncedKeyword],
    queryFn: () => endpoints.lookupReference(targetFormId, debouncedKeyword, { pageSize: 20 }),
    enabled: open && debouncedKeyword.length > 0,
    staleTime: 30 * 1000,
  });

  return { results, debouncedKeyword };
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

- [ ] **Step 5: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable typecheck
git add packages/form-embeddable/src/hooks
git commit -m "feat(emb): add 4 internal hooks (useFormSchema, useFormData, useFormList, useReferenceLookup)"
```

---

## Phase 1 Final Verification

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable typecheck
```

Expected: clean.

Final commit: `chore: phase 1 (foundation) verified` --allow-empty

**Phase 1 complete.** Proceed to [Part 2: FieldRenderer + ReferenceField](2026-06-26-embeddable-components-part2-field-components.md).
