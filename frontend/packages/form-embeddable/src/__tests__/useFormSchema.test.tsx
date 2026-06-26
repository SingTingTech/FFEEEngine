import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useFormSchema } from '../hooks/useFormSchema';
import { createHttp, createEndpoints } from '../api';
import { server } from './mocks/server';

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe('useFormSchema', () => {
  it('fetches schema on mount', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const http = createHttp({ apiBase: 'http://localhost' });
    const endpoints = createEndpoints(http);
    const { result } = renderHook(() => useFormSchema(endpoints, 42), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.formId).toBe(42);
    expect(result.current.data?.name).toBe('订单');
  });

  it('disabled when formId is 0', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const http = createHttp({ apiBase: 'http://localhost' });
    const endpoints = createEndpoints(http);
    const { result } = renderHook(() => useFormSchema(endpoints, 0, { enabled: false }), { wrapper: wrapper(qc) });
    expect(result.current.isFetching).toBe(false);
  });
});
