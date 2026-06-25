# Part 6: Frontend Pages & State

**Phase:** 6 of 7
**Tasks:** 6.1 – 6.7
**End state:** Login page works against backend; user/role management pages render tables with CRUD modals; logout invalidates JWT.

**Pre-requisite:** Phase 5 complete.

---

## Task 6.1: axios http client with interceptors

**Files:**
- Create: `frontend/apps/platform-admin/src/api/http.ts`
- Create: `frontend/apps/platform-admin/src/api/auth.ts`
- Create: `frontend/apps/platform-admin/src/api/user.ts`
- Create: `frontend/apps/platform-admin/src/api/role.ts`
- Create: `frontend/apps/platform-admin/src/api/permission.ts`

- [ ] **Step 1: Create api directory**

```bash
mkdir -p /home/cris/dev/safeValidator/frontend/apps/platform-admin/src/api
```

- [ ] **Step 2: Create http.ts (axios instance + interceptors)**

```typescript
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Result } from '@safe-validator/shared-types';
import { useAuthStore } from '@/stores/auth';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<Result<unknown>>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Unwrap Result<T> envelope and throw on error code. */
export async function request<T>(promise: Promise<AxiosResponse<Result<T>>>): Promise<T> {
  const response = await promise;
  const body = response.data;
  if (body.code !== 0) {
    throw new Error(body.message || `Request failed with code ${body.code}`);
  }
  return body.data as T;
}
```

- [ ] **Step 3: Create auth.ts**

```typescript
import { http, request } from './http';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    username: string;
    realName: string | null;
    roles: string[];
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>(http.post<import('@safe-validator/shared-types').Result<LoginResponse>>('/auth/login', data)),
  logout: () => request<void>(http.post('/auth/logout')),
  refresh: (refreshToken: string) =>
    request<LoginResponse>(http.post('/auth/refresh', { refreshToken })),
};
```

- [ ] **Step 4: Create user.ts**

```typescript
import { http, request } from './http';
import { PageQuery, PageResult } from '@safe-validator/shared-types';

export interface UserVO {
  id: number;
  username: string;
  realName: string | null;
  email: string | null;
  phone: string | null;
  status: number;
  lastLoginAt: string | null;
  createTime: string;
  roles: string[];
}

export interface UserCreateRequest {
  username: string;
  password: string;
  realName?: string;
  email?: string;
  phone?: string;
  status?: number;
  roleIds?: number[];
}

export type UserUpdateRequest = Partial<UserCreateRequest>;

export const userApi = {
  page: (query: PageQuery) =>
    request<PageResult<UserVO>>(
      http.get('/admin/users', {
        params: {
          pageNum: query.pageNum ?? 1,
          pageSize: query.pageSize ?? 20,
          keyword: query.keyword,
        },
      }),
    ),
  get: (id: number) => request<UserVO>(http.get(`/admin/users/${id}`)),
  create: (data: UserCreateRequest) =>
    request<number>(http.post('/admin/users', data)),
  update: (id: number, data: UserUpdateRequest) =>
    request<void>(http.put(`/admin/users/${id}`, data)),
  delete: (id: number) => request<void>(http.delete(`/admin/users/${id}`)),
};
```

- [ ] **Step 5: Create role.ts**

```typescript
import { http, request } from './http';
import { PageResult } from '@safe-validator/shared-types';

export interface RoleVO {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: number;
  permissionIds: number[];
}

export interface RoleRequest {
  code: string;
  name: string;
  description?: string;
  status?: number;
  permissionIds?: number[];
}

export const roleApi = {
  page: (params: { pageNum?: number; pageSize?: number; keyword?: string }) =>
    request<PageResult<RoleVO>>(http.get('/admin/roles', { params })),
  listAll: () => request<RoleVO[]>(http.get('/admin/roles/all')),
  create: (data: RoleRequest) => request<number>(http.post('/admin/roles', data)),
  update: (id: number, data: RoleRequest) =>
    request<void>(http.put(`/admin/roles/${id}`, data)),
  delete: (id: number) => request<void>(http.delete(`/admin/roles/${id}`)),
};
```

- [ ] **Step 6: Create permission.ts**

```typescript
import { http, request } from './http';

export interface PermissionNode {
  id: number;
  parentId: number;
  code: string;
  name: string;
  type: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  children: PermissionNode[];
}

export const permissionApi = {
  tree: () => request<PermissionNode[]>(http.get('/admin/permissions/tree')),
};
```

- [ ] **Step 7: Verify typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
```

- [ ] **Step 8: Commit**

```bash
cd frontend
git add apps/platform-admin/src/api
git commit -m "feat(platform-admin): add axios http client and API modules"
```

---

## Task 6.2: Zustand stores

**Files:**
- Create: `frontend/apps/platform-admin/src/stores/auth.ts`
- Create: `frontend/apps/platform-admin/src/stores/ui.ts`

- [ ] **Step 1: Create stores directory**

```bash
mkdir -p /home/cris/dev/safeValidator/frontend/apps/platform-admin/src/stores
```

- [ ] **Step 2: Create auth.ts**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  realName: string | null;
  roles: string[];

  setSession: (s: {
    token: string;
    refreshToken: string;
    username: string;
    realName: string | null;
    roles: string[];
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      username: null,
      realName: null,
      roles: [],

      setSession: (s) =>
        set({
          token: s.token,
          refreshToken: s.refreshToken,
          username: s.username,
          realName: s.realName,
          roles: s.roles,
        }),

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          username: null,
          realName: null,
          roles: [],
        }),
    }),
    {
      name: 'sv-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        username: s.username,
        realName: s.realName,
        roles: s.roles,
      }),
    },
  ),
);
```

- [ ] **Step 3: Create ui.ts**

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
```

- [ ] **Step 4: Verify + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd frontend
git add apps/platform-admin/src/stores
git commit -m "feat(platform-admin): add Zustand auth and ui stores"
```

---

## Task 6.3: Login page

**Files:**
- Create: `frontend/apps/platform-admin/src/pages/Login.tsx`
- Create: `frontend/apps/platform-admin/src/routes/RequireAuth.tsx`

- [ ] **Step 1: Create directories**

```bash
mkdir -p /home/cris/dev/safeValidator/frontend/apps/platform-admin/src/pages
mkdir -p /home/cris/dev/safeValidator/frontend/apps/platform-admin/src/routes
```

- [ ] **Step 2: Create RequireAuth guard**

```typescript
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 3: Create Login page**

```typescript
import { useState } from 'react';
import { Form, Input, Button, Card, Typography, App as AntdApp } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const { message } = AntdApp.useApp();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const data = await authApi.login(values);
      setSession({
        token: data.accessToken,
        refreshToken: data.refreshToken,
        username: data.user.username,
        realName: data.user.realName,
        roles: data.user.roles,
      });
      message.success('登录成功');
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          safeValidator
        </Typography.Title>
        <Form<LoginForm> layout="vertical" onFinish={onFinish} initialValues={{ username: 'admin' }}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              登录
            </Button>
          </Form.Item>
          <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            默认账号: admin / admin123
          </Typography.Text>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd frontend
git add apps/platform-admin/src/pages apps/platform-admin/src/routes
git commit -m "feat(platform-admin): add login page and auth guard"
```

---

## Task 6.4: Refactor App.tsx with new layout + routing

**Files:**
- Modify: `frontend/apps/platform-admin/src/App.tsx`

- [ ] **Step 1: Replace App.tsx**

```typescript
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Typography, Button, App as AntdApp } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';
import { RequireAuth } from '@/routes/RequireAuth';
import LoginPage from '@/pages/Login';
import UserPage from '@/pages/User';
import RolePage from '@/pages/Role';

const { Header, Sider, Content } = Layout;

function MainLayout() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const username = useAuthStore((s) => s.username);
  const realName = useAuthStore((s) => s.realName);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore: blacklist may already have the token */
    }
    logout();
    message.success('已退出');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          safeValidator Admin
        </Typography.Title>
        <Dropdown
          menu={{
            items: [
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: onLogout,
              },
            ],
          }}
        >
          <Button type="text">
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            {realName || username}
          </Button>
        </Dropdown>
      </Header>
      <Layout>
        <Sider width={220} theme="light">
          <Menu
            mode="inline"
            defaultSelectedKeys={['users']}
            items={[
              { key: 'users', label: <Link to="/users">用户管理</Link> },
              { key: 'roles', label: <Link to="/roles">角色管理</Link> },
            ]}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#fff' }}>
          <Routes>
            <Route path="/users" element={<UserPage />} />
            <Route path="/roles" element={<RolePage />} />
            <Route path="*" element={<Navigate to="/users" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 2: Install ant-design icons**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin add @ant-design/icons
```

- [ ] **Step 3: Verify typecheck (expect missing User/Role page errors — fixed in next tasks)**

```bash
pnpm --filter platform-admin typecheck 2>&1 | tail -20
```

(Will show TS errors for missing imports — proceed to next tasks to add UserPage and RolePage.)

- [ ] **Step 4: Commit (will fix later)**

```bash
cd frontend
git add apps/platform-admin/src/App.tsx apps/platform-admin/package.json pnpm-lock.yaml
git commit -m "feat(platform-admin): restructure App with layout and routing"
```

---

## Task 6.5: User management page

**Files:**
- Create: `frontend/apps/platform-admin/src/pages/User.tsx`

- [ ] **Step 1: Create User page**

```typescript
import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, App as AntdApp, Popconfirm, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, UserCreateRequest, UserUpdateRequest, UserVO } from '@/api/user';
import { roleApi, RoleVO } from '@/api/role';

export default function UserPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<UserVO | null>(null);
  const [form] = Form.useForm<UserCreateRequest | (UserUpdateRequest & { id?: number })>();

  const { data, isLoading } = useQuery({
    queryKey: ['users', 'list', keyword],
    queryFn: () => userApi.page({ pageNum: 1, pageSize: 20, keyword }),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => roleApi.listAll(),
  });

  const createMut = useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      message.success('创建成功');
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditing({} as UserVO);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdateRequest }) => userApi.update(id, data),
    onSuccess: () => {
      message.success('更新成功');
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditing(null);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    setEditing({} as UserVO);
    form.resetFields();
  };

  const openEdit = (record: UserVO) => {
    setEditing(record);
    form.setFieldsValue({
      username: record.username,
      realName: record.realName ?? undefined,
      email: record.email ?? undefined,
      phone: record.phone ?? undefined,
      status: record.status,
      roleIds: roles?.filter((r) => record.roles.includes(r.name)).map((r) => r.id),
    });
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    if (editing && editing.id) {
      updateMut.mutate({ id: editing.id, data: values });
    } else {
      createMut.mutate(values as UserCreateRequest);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索用户名或姓名"
          allowClear
          onSearch={setKeyword}
          style={{ width: 240 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建用户
        </Button>
      </Space>

      <Table<UserVO>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.records ?? []}
        pagination={{ total: data?.total ?? 0, pageSize: data?.pageSize ?? 20, current: data?.pageNum ?? 1 }}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'realName' },
          { title: '邮箱', dataIndex: 'email' },
          { title: '电话', dataIndex: 'phone' },
          {
            title: '角色',
            dataIndex: 'roles',
            render: (r: string[]) => r.join(', '),
          },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: number) => (s === 1 ? '启用' : '禁用'),
          },
          { title: '创建时间', dataIndex: 'createTime' },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => openEdit(record)}>编辑</Button>
                <Popconfirm title="确认删除?" onConfirm={() => deleteMut.mutate(record.id)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing?.id ? '编辑用户' : '新建用户'}
        open={!!editing}
        onCancel={() => {
          setEditing(null);
          form.resetFields();
        }}
        onOk={onSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 3 }]}>
            <Input disabled={!!editing?.id} />
          </Form.Item>
          {!editing?.id && (
            <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="realName" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(v) => (v ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch />
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select<number[]>
              mode="multiple"
              allowClear
              options={roles?.map((r: RoleVO) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd frontend
git add apps/platform-admin/src/pages/User.tsx
git commit -m "feat(platform-admin): add user management page with CRUD"
```

---

## Task 6.6: Role management page

**Files:**
- Create: `frontend/apps/platform-admin/src/pages/Role.tsx`

- [ ] **Step 1: Create Role page**

```typescript
import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, App as AntdApp, Popconfirm, Switch, Tree } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleApi, RoleRequest, RoleVO } from '@/api/role';
import { permissionApi, PermissionNode } from '@/api/permission';

interface FormValues extends RoleRequest {}

export default function RolePage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<RoleVO | null>(null);
  const [form] = Form.useForm<FormValues>();

  const { data, isLoading } = useQuery({
    queryKey: ['roles', 'page', keyword],
    queryFn: () => roleApi.page({ pageNum: 1, pageSize: 20, keyword }),
  });

  const { data: permTree } = useQuery({
    queryKey: ['permissions', 'tree'],
    queryFn: () => permissionApi.tree(),
  });

  const createMut = useMutation({
    mutationFn: roleApi.create,
    onSuccess: () => {
      message.success('创建成功');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setEditing(null);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleRequest }) => roleApi.update(id, data),
    onSuccess: () => {
      message.success('更新成功');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setEditing(null);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: roleApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const onSubmit = async () => {
    const values = await form.validateFields();
    if (editing && editing.id) {
      updateMut.mutate({ id: editing.id, data: values });
    } else {
      createMut.mutate(values);
    }
  };

  const treeData = permTree?.map((p: PermissionNode) => toTreeNode(p));

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索角色" allowClear onSearch={setKeyword} style={{ width: 240 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing({} as RoleVO); form.resetFields(); }}>
          新建角色
        </Button>
      </Space>

      <Table<RoleVO>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.records ?? []}
        pagination={{ total: data?.total ?? 0, pageSize: data?.pageSize ?? 20, current: data?.pageNum ?? 1 }}
        columns={[
          { title: '编码', dataIndex: 'code' },
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description' },
          { title: '状态', dataIndex: 'status', render: (s: number) => (s === 1 ? '启用' : '禁用') },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => {
                  setEditing(record);
                  form.setFieldsValue({
                    code: record.code,
                    name: record.name,
                    description: record.description ?? undefined,
                    status: record.status,
                    permissionIds: record.permissionIds,
                  });
                }}>编辑</Button>
                <Popconfirm title="确认删除?" onConfirm={() => deleteMut.mutate(record.id)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing?.id ? '编辑角色' : '新建角色'}
        open={!!editing}
        onCancel={() => { setEditing(null); form.resetFields(); }}
        onOk={onSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="编码" rules={[{ required: true }]}>
            <Input disabled={!!editing?.id} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(v) => (v ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch />
          </Form.Item>
          <Form.Item name="permissionIds" label="权限">
            <Tree<number>
              checkable
              defaultExpandAll
              treeData={treeData}
              fieldNames={{ value: 'id', label: 'name', children: 'children' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function toTreeNode(p: PermissionNode): { id: number; name: string; children?: ReturnType<typeof toTreeNode>[] } {
  return {
    id: p.id,
    name: p.name,
    children: p.children?.map(toTreeNode),
  };
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd frontend
git add apps/platform-admin/src/pages/Role.tsx
git commit -m "feat(platform-admin): add role management page with permission tree"
```

---

## Task 6.7: Phase 6 verification

- [ ] **Step 1: Start backend in background**

```bash
docker run -d --name sv-postgres -e POSTGRES_DB=safe_validator -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
docker run -d --name sv-redis -p 6379:6379 redis:7-alpine

cd /home/cris/dev/safeValidator/backend
DB_PASSWORD=postgres \
JWT_SECRET=this-is-a-test-secret-for-development-only-32bytes \
nohup mvn -pl safe-validator-start spring-boot:run > /tmp/sv-backend.log 2>&1 &

# Wait for backend ready
for i in $(seq 1 60); do
  curl -s http://localhost:8080/actuator/health 2>/dev/null | grep -q UP && break
  sleep 2
done
curl -s http://localhost:8080/actuator/health
```

Expected: `{"status":"UP"}`

- [ ] **Step 2: Start frontend dev server in background**

```bash
cd /home/cris/dev/safeValidator/frontend
nohup pnpm dev > /tmp/sv-dev.log 2>&1 &
sleep 8
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

Expected: `200`

- [ ] **Step 3: Test login API via dev server proxy**

```bash
curl -s -X POST http://localhost:5173/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq .
```

Expected: JSON with `code: 0` and `data.accessToken`.

- [ ] **Step 4: Verify Vite proxy works for all admin endpoints**

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.accessToken')

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/admin/users | jq '.code, .data.total'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/admin/roles | jq '.code, .data.total'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/admin/permissions/tree | jq '.code, (.data | length)'
```

All should return `0` (success).

- [ ] **Step 5: Stop background processes**

```bash
pkill -f "vite" || true
pkill -f "spring-boot:run" || true
sleep 2
docker stop sv-postgres sv-redis && docker rm sv-postgres sv-redis
```

- [ ] **Step 6: Commit any final**

```bash
cd frontend
git status
git add -A
git commit -m "chore: phase 6 verified" --allow-empty
```

**Phase 6 complete.** Proceed to [Part 7: Containerization](./2026-06-25-infrastructure-layer-part7-containerization.md).
