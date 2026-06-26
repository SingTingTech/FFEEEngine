import { useNavigate } from 'react-router-dom';
import { App, Button, Layout, Space, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, RocketOutlined, SaveOutlined } from '@ant-design/icons';
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
  const version = useDesignerStore((s) => s.version);
  const isCurrent = useDesignerStore((s) => s.isCurrent);
  const isDirty = useDesignerStore((s) => s.isDirty);
  const formId = useDesignerStore((s) => s.formId);
  const loadSchema = useDesignerStore((s) => s.loadSchema);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveDraft = async () => {
    if (!formId) return;
    setSaving(true);
    try {
      // Drafts are saved as a new schema version with status=草稿
      // For MVP: we re-use the publish endpoint to "save" (creates a new version each time)
      // In future, separate save-draft endpoint
      const req = buildUpdateRequest(useDesignerStore.getState());
      await designerApi.publishNewVersion(formId, req);
      message.success('草稿已保存');
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
      <Tag color={isCurrent ? 'green' : 'orange'}>v{version} {isCurrent ? '已发布' : '草稿'}</Tag>
      {targetTable && <Tag>映射到表: {targetTable}</Tag>}

      <div style={{ flex: 1 }} />

      <Space>
        <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
          预览
        </Button>
        <Button icon={<SaveOutlined />} loading={saving} onClick={saveDraft} disabled={!isDirty}>
          保存草稿
        </Button>
        <Button type="primary" icon={<RocketOutlined />} onClick={saveDraft}>
          发布新版本
        </Button>
      </Space>

      <PreviewDrawer open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </Header>
  );
}
