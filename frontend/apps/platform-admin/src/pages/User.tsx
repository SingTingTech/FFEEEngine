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