# Part 4: FormList

**Phase:** 4 of 5
**Tasks:** 4.1
**End state:** List component with table rendering, search, pagination, CRUD action buttons that fire consumer callbacks.

**Working directory:** `/home/cris/dev/safeValidator/frontend/`

---

## Task 4.1: FormList (CRUD via consumer callbacks)

**Files:**
- Create: `frontend/packages/form-embeddable/src/components/FormList.tsx`

- [ ] **Step 1: Create FormList**

```tsx
import { Button, Card, ConfigProvider, Input, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect } from 'react';
import zhCN from 'antd/locale/zh_CN';
import type { FormListProps, FormRecord } from '../types';
import { createHttp, createEndpoints, type Endpoints, type Http } from '../api';
import { useFormSchema, useFormList } from '../hooks';

const { Search } = Input;

export function FormList(props: FormListProps) {
  const {
    formId, apiBase, token, pageSize = 20, searchableFields,
    defaultSort, columns: customColumns,
    onCreate, onView, onEdit, onDelete,
    title, themeToken,
  } = props;

  const http: Http = useMemo(() => createHttp({ apiBase, token }), [apiBase, token]);
  const endpoints: Endpoints = useMemo(() => createEndpoints(http), [http]);

  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Debounce keyword
  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(searchInput);
      setPageNum(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: schema } = useFormSchema(endpoints, formId);
  const { data: listData, isLoading, refetch } = useFormList(endpoints, formId, {
    pageNum,
    pageSize,
    keyword: keyword || undefined,
  });

  // Build columns: custom or auto from schema
  const autoColumns = useMemo(() => {
    if (!schema) return [];
    const fields = (schema.fields ?? []).filter((f) => f.type !== 'subform');
    return fields.slice(0, 5).map((f) => ({
      title: f.name,
      dataIndex: f.code,
      ellipsis: true,
    }));
  }, [schema]);

  const dataColumns = (customColumns && customColumns.length > 0) ? customColumns : autoColumns;

  const actionColumn = {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right' as const,
    render: (_: any, record: FormRecord) => {
      const buttons: React.ReactNode[] = [];
      if (onView) {
        buttons.push(
          <Button key="view" size="small" type="link" icon={<EyeOutlined />} onClick={() => onView(record.id)}>
            查看
          </Button>,
        );
      }
      if (onEdit) {
        buttons.push(
          <Button key="edit" size="small" type="link" icon={<EditOutlined />} onClick={() => onEdit(record.id)}>
            编辑
          </Button>,
        );
      }
      if (onDelete) {
        buttons.push(
          <Popconfirm
            key="del"
            title="确认删除？"
            onConfirm={async () => {
              try {
                await onDelete(record.id);
                refetch();
              } catch (e) {
                // consumer logs error
              }
            }}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>,
        );
      }
      return <Space size="small">{buttons}</Space>;
    },
  };

  return (
    <ConfigProvider locale={zhCN} theme={themeToken ? { token: themeToken } : undefined}>
      <Card
        title={title ?? schema?.name ?? '表单列表'}
        extra={
          <Space>
            {onCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
                新建
              </Button>
            )}
            <Tooltip title="刷新">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            </Tooltip>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索..."
            allowClear
            onSearch={setSearchInput}
            onChange={(e) => {
              if (!e.target.value) setSearchInput('');
            }}
            style={{ width: 240 }}
          />
        </Space>
        <Table<FormRecord>
          rowKey="id"
          loading={isLoading}
          dataSource={listData?.records ?? []}
          columns={[...dataColumns, actionColumn]}
          scroll={{ x: 'max-content' }}
          pagination={{
            total: listData?.total ?? 0,
            pageSize,
            current: pageNum,
            showSizeChanger: false,
            onChange: setPageNum,
          }}
        />
      </Card>
    </ConfigProvider>
  );
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter form-embeddable typecheck
git add packages/form-embeddable/src/components/FormList.tsx
git commit -m "feat(emb): add FormList (CRUD with consumer callbacks)"
```

**Phase 4 complete.** Proceed to [Part 5: Tests + Integration + README](2026-06-26-embeddable-components-part5-tests.md).
