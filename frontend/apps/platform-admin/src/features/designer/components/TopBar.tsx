import { useNavigate } from 'react-router-dom';
import { App, Button, Layout, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import { useDesignerStore, buildUpdateRequest } from '@/services/designer/designerStore';
import { designerApi } from '@/services/designer/designerApi';
import { useState } from 'react';
import { PreviewDrawer } from './PreviewDrawer';

const { Header } = Layout;

export function TopBar() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const formName = useDesignerStore((s) => s.formName);
  const targetTable = useDesignerStore((s) => s.targetTable);
  const isDirty = useDesignerStore((s) => s.isDirty);
  const formId = useDesignerStore((s) => s.formId);
  const loadSchema = useDesignerStore((s) => s.loadSchema);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // No separate draft / publish flow — saving is the publish action. The
  // backend endpoint still bumps the schema version internally, but that's
  // an implementation detail, not a user-facing concept.
  const save = async () => {
    if (!formId) return;
    setSaving(true);
    try {
      const req = buildUpdateRequest(useDesignerStore.getState());
      await designerApi.publishNewVersion(formId, req);
      message.success('已保存');
      // Reload the schema to sync state
      const fresh = await designerApi.getForm(formId);
      loadSchema({
        formId: fresh.formId,
        schemaId: fresh.schemaId,
        formName: fresh.name,
        targetTable: fresh.targetTable,
        version: fresh.version,
        isCurrent: fresh.isCurrent ?? false,
        fields: fresh.fields,
        sections: fresh.sections,
        relationships: fresh.relationships,
      });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/designer')}>
        返回
      </Button>

      <Typography.Title level={4} style={{ margin: 0 }}>
        📋 {formName}
      </Typography.Title>
      {targetTable && <Tag>映射到表: {targetTable}</Tag>}

      <div style={{ flex: 1 }} />

      <Space>
        <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
          预览
        </Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={save}
          disabled={!isDirty}
        >
          保存
        </Button>
      </Space>

      <PreviewDrawer open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </Header>
  );
}
