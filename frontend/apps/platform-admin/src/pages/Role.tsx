import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, App as AntdApp, Popconfirm, Switch, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
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
            <Tree
              checkable
              defaultExpandAll
              treeData={treeData}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function toTreeNode(p: PermissionNode): DataNode {
  return {
    key: p.id,
    title: p.name,
    children: p.children?.map(toTreeNode),
  };
}