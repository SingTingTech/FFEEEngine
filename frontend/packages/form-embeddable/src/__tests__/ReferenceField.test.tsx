import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { ReferenceField } from '../components/ReferenceField';
import { server } from './mocks/server';
import { createHttp, createEndpoints } from '../api';

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConfigProvider>{ui}</ConfigProvider>
    </QueryClientProvider>,
  );
}

const endpoints = createEndpoints(createHttp({ apiBase: 'http://localhost' }));

describe('ReferenceField', () => {
  it('renders display value when readOnly', () => {
    renderWith(
      <ReferenceField
        endpoints={endpoints}
        referenceFormId={42}
        referenceDisplayField="customer_name"
        storageType="bigint"
        value={null}
        onChange={vi.fn()}
        readOnly
      />,
    );
    expect(screen.getByDisplayValue('—')).toBeInTheDocument();
  });
});
