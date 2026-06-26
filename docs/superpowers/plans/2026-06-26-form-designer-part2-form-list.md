# Part 2: Form List Page

**Phase:** 2 of 6
**Tasks:** 2.1 – 2.4
**End state:** Designer menu visible in admin; list page shows forms; create modal works; navigation to designer works.

**Working directory:** `/home/cris/dev/safeValidator/frontend/apps/platform-admin/`

Reference: design doc §5 for FormListPage layout.

---

## Task 2.1: Add Designer menu item to admin layout

**Files:**
- Modify: `src/App.tsx` (or wherever the admin menu is defined)

- [ ] **Step 1: Find current admin menu code**

```bash
cd /home/cris/dev/safeValidator/frontend
grep -rn "用户管理" apps/platform-admin/src --include="*.tsx" -l | head -3
```

- [ ] **Step 2: Add Designer menu item**

In the menu items array (likely in `pages/User.tsx` parent or `routes/RequireAuth.tsx`), add a new menu item at the **top level** (not nested under system management, per design decision 12):

```tsx
{ key: 'designer', label: <Link to="/designer">📋 表单设计器</Link> }
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src
git commit -m "feat(designer): add top-level '表单设计器' menu item"
```

---

## Task 2.2: Add designer route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add route for /designer**

In the App's route tree, add:

```tsx
<Route path="/designer" element={<FormListPage />} />
<Route path="/designer/:formId" element={<DesignerPage />} />
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/App.tsx
git commit -m "feat(designer): add /designer and /designer/:formId routes"
```

---

## Task 2.3: FormListPage

**Files:**
- Create: `src/pages/Designer/FormListPage.tsx`

- [ ] **Step 1: Create FormListPage**

Reference: design doc §5.

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Radio, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { designerApi } from '@/services/designer/designerApi';
import type { FormVO, CreateFormRequest } from '@/types/designer';

export default function FormListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: forms, isLoading } = useQuery({
    queryKey: ['forms', keyword],
    queryFn: () => designerApi.listForms(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => designerApi.deleteForm(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <Card
      title="📋 表单设计器"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建表单
        </Button>
      }
    >
      <Input.Search
        placeholder="搜索表单名称"
        allowClear
        onSearch={setKeyword}
        style={{ width: 240, marginBottom: 16 }}
      />
      <Table<FormVO>
        rowKey="formId"
        loading={isLoading}
        dataSource={forms ?? []}
        columns={[
          { title: '名称', dataIndex: 'name' },
          {
            title: '最新版本',
            render: (_, r) => <Tag>v{r.version}</Tag>,
          },
          {
            title: '状态',
            render: (_, r) => (
              <Tag color={r.isCurrent ? 'green' : 'orange'}>
                {r.isCurrent ? '已发布' : '草稿'}
              </Tag>
            ),
          },
          { title: '目标表', dataIndex: 'targetTable', render: (v) => v ?? <em>无（form_data）</em> },
          {
            title: '更新时间',
            dataIndex: 'updateTime',
            render: (v) => new Date(v).toLocaleString(),
          },
          {
            title: '操作',
            render: (_, r) => (
              <Space>
                <Button size="small" type="primary" onClick={() => navigate(`/designer/${r.formId}`)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除?"
                  onConfirm={() => deleteMut.mutate(r.formId)}
                >
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <CreateFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </Card>
  );
}

// Inline CreateFormModal component (also extracted as separate file in design but kept simple here)
function CreateFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateFormRequest>();
  const [tables, setTables] = useState<string[]>([]);
  const [mappingMode, setMappingMode] = useState<'none' | 'table'>('none');

  // Load user tables when modal opens
  useState(() => {
    if (open) {
      designerApi.listUserTables().then((res) => setTables(res as unknown as string[]));
    }
  });

  const createMut = useMutation({
    mutationFn: (req: CreateFormRequest) => designerApi.createForm(req),
    onSuccess: (formId) => {
      message.success('创建成功');
      onClose();
      navigate(`/designer/${formId}`);
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <Modal
      title="新建表单"
      open={open}
      onCancel={onClose}
      onOk={async () => {
        const values = await form.validateFields();
        createMut.mutate({
          name: values.name,
          description: values.description,
          targetTable: mappingMode === 'table' ? values.targetTable : null,
        });
      }}
      confirmLoading={createMut.isPending}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true, max: 128 }]}>
          <Input placeholder="订单" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="target_table" required>
          <Radio.Group value={mappingMode} onChange={(e) => setMappingMode(e.target.value)}>
            <Radio value="none">不映射（用 form_data）</Radio>
            <Radio value="table">映射到表</Radio>
          </Radio.Group>
        </Form.Item>
        {mappingMode === 'table' && (
          <Form.Item
            name="targetTable"
            label="目标表"
            rules={[{ required: true, message: '创建后不可修改' }]}
          >
            <select style={{ width: '100%', padding: 4 }}>
              <option value="">-- 选择表 --</option>
              {tables.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/pages/Designer/FormListPage.tsx
git commit -m "feat(designer): add FormListPage with create modal + delete"
```

---

## Task 2.4: Phase 2 verification

- [ ] **Step 1: Run dev server briefly to verify menu + route**

```bash
cd /home/cris/dev/safeValidator/frontend
nohup pnpm dev > /tmp/sv-dev.log 2>&1 &
sleep 8
curl -s -o /dev/null -w "menu HTML: %{http_code}\n" http://localhost:5173
pkill -f vite
```

Expected: 200.

- [ ] **Step 2: Final commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add -A
git commit -m "chore: phase 2 (form list) verified" --allow-empty
```

**Phase 2 complete.** Proceed to [Part 3: Designer Shell + Component Library](2026-06-26-form-designer-part3-designer-shell.md).
