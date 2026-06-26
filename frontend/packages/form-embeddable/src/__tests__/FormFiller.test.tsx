import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { FormFiller } from '../components/FormFiller';
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

describe('FormFiller (integration)', () => {
  it('loads and renders schema fields', async () => {
    renderWith(<FormFiller formId={42} apiBase="http://localhost" />);
    await waitFor(() => {
      expect(screen.getByText('客户名称')).toBeInTheDocument();
    });
    expect(screen.getByText('总金额')).toBeInTheDocument();
  });

  it('shows required error when submitting empty', async () => {
    const onSuccess = vi.fn();
    renderWith(
      <FormFiller formId={42} apiBase="http://localhost" onSubmitSuccess={onSuccess} />,
    );
    await waitFor(() => expect(screen.getByText('客户名称')).toBeInTheDocument());
    // AntD inserts a space between CJK characters in button text ("保 存").
    // Locate the primary button by its class.
    const saveBtn = document.querySelector<HTMLButtonElement>('button.ant-btn-primary')!;
    expect(saveBtn).toBeTruthy();
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByText('客户名称不能为空')).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('submits valid data successfully', async () => {
    const onSuccess = vi.fn();
    renderWith(
      <FormFiller formId={42} apiBase="http://localhost" onSubmitSuccess={onSuccess} />,
    );
    await waitFor(() => expect(screen.getByText('客户名称')).toBeInTheDocument());
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'ACME' } });
    // InputNumber renders role=spinbutton; set its value
    const numberInput = screen.getByRole('spinbutton');
    fireEvent.change(numberInput, { target: { value: '999' } });
    fireEvent.blur(numberInput);
    const saveBtn = document.querySelector<HTMLButtonElement>('button.ant-btn-primary')!;
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(200);
    });
  });

  it('shows cancel button only when onCancel is provided', async () => {
    const onCancel = vi.fn();
    renderWith(
      <FormFiller formId={42} apiBase="http://localhost" onCancel={onCancel} />,
    );
    await waitFor(() => expect(screen.getByText('客户名称')).toBeInTheDocument());
    const cancelBtn = document.querySelector<HTMLButtonElement>('button:not(.ant-btn-primary)')!;
    expect(cancelBtn).toBeTruthy();
    // AntD inserts a space between CJK chars ("取 消"); match after normalization.
    expect((cancelBtn.textContent ?? '').replace(/\s+/g, '')).toMatch(/取消/);
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it('hides cancel button when onCancel not provided', async () => {
    renderWith(<FormFiller formId={42} apiBase="http://localhost" />);
    await waitFor(() => expect(screen.getByText('客户名称')).toBeInTheDocument());
    const buttons = document.querySelectorAll<HTMLButtonElement>('button');
    const hasCancel = Array.from(buttons).some((b) => /取消/.test((b.textContent ?? '').replace(/\s+/g, '')));
    expect(hasCancel).toBe(false);
  });
});
