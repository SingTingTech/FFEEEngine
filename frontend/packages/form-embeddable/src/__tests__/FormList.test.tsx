import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { FormList } from '../components/FormList';
import { server } from './mocks/server';

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

describe('FormList', () => {
  it('loads and renders table with default columns from schema', async () => {
    renderWith(<FormList formId={42} apiBase="http://localhost" />);
    await waitFor(() => {
      expect(screen.getByText('ACME')).toBeInTheDocument();
    });
  });

  it('hides action buttons when callbacks not provided', async () => {
    renderWith(<FormList formId={42} apiBase="http://localhost" />);
    await waitFor(() => expect(screen.getByText('ACME')).toBeInTheDocument());
    expect(screen.queryByText('查看')).toBeNull();
    expect(screen.queryByText('编辑')).toBeNull();
    expect(screen.queryByText('删除')).toBeNull();
  });

  it('shows action buttons when callbacks provided', async () => {
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderWith(
      <FormList formId={42} apiBase="http://localhost" onView={onView} onEdit={onEdit} onDelete={onDelete} />,
    );
    await waitFor(() => expect(screen.getByText('ACME')).toBeInTheDocument());
    fireEvent.click(screen.getByText('查看'));
    expect(onView).toHaveBeenCalledWith(100);
  });

  it('shows 新建 button when onCreate provided', async () => {
    const onCreate = vi.fn();
    renderWith(<FormList formId={42} apiBase="http://localhost" onCreate={onCreate} />);
    await waitFor(() => expect(screen.getByText('ACME')).toBeInTheDocument());
    const btn = screen.getByText('新建');
    fireEvent.click(btn);
    expect(onCreate).toHaveBeenCalled();
  });
});
