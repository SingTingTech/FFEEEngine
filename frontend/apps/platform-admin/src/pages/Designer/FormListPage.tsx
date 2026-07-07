import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Radio, Space, Table } from 'antd';
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
    mutationFn: (id: string) => designerApi.deleteForm(id),
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
  useEffect(() => {
    if (open) {
      designerApi.listUserTables()
        .then((res) => setTables(res))
        .catch(() => setTables([]));
    }
  }, [open]);

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
          <Input placeholder="请输入表单名称" />
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