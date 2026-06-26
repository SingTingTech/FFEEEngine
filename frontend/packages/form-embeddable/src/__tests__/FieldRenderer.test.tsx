import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { FieldRenderer } from '../components/FieldRenderer';
import type { FormFieldDefVO } from '../types';

const baseField: FormFieldDefVO = {
  id: 1, schemaId: 1, code: 'f', name: '字段', type: 'text',
  required: false, defaultValue: null, sortOrder: 0,
  config: null, validation: null, targetColumn: null,
  sectionId: null, isLinkField: false,
  createTime: '', updateTime: '',
};

describe('FieldRenderer', () => {
  it('renders text input', () => {
    const onChange = vi.fn();
    render(<ConfigProvider><FieldRenderer field={baseField} value="hello" onChange={onChange} /></ConfigProvider>);
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
  });

  it('renders number input', () => {
    const onChange = vi.fn();
    const field = { ...baseField, type: 'number' as const };
    render(<ConfigProvider><FieldRenderer field={field} value={42} onChange={onChange} /></ConfigProvider>);
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('renders boolean as switch', () => {
    const onChange = vi.fn();
    const field = { ...baseField, type: 'boolean' as const };
    render(<ConfigProvider><FieldRenderer field={field} value={true} onChange={onChange} /></ConfigProvider>);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeChecked();
  });

  it('renders select with options from config', () => {
    const onChange = vi.fn();
    const field: FormFieldDefVO = {
      ...baseField,
      type: 'select',
      config: { options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
    };
    render(<ConfigProvider><FieldRenderer field={field} value="a" onChange={onChange} /></ConfigProvider>);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('disabled when disabled=true', () => {
    const onChange = vi.fn();
    render(<ConfigProvider><FieldRenderer field={baseField} value="" onChange={onChange} disabled /></ConfigProvider>);
    expect(screen.getByDisplayValue('')).toBeDisabled();
  });
});
