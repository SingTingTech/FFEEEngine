# Part 3: Designer Shell + Component Library

**Phase:** 3 of 6
**Tasks:** 3.1 – 3.4
**End state:** 3-pane layout works; component library shows 6 categories; click-to-add works.

**Working directory:** `/home/cris/dev/safeValidator/frontend/apps/platform-admin/`

Reference: design doc §6 for the shell layout, §6.3 for ComponentLibrary.

---

## Task 3.1: DesignerPage shell

**Files:**
- Create: `src/pages/Designer/DesignerPage.tsx`

- [ ] **Step 1: Create DesignerPage**

```tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { App, Layout, Spin } from 'antd';
import { designerApi } from '@/services/designer/designerApi';
import { useDesignerStore } from '@/services/designer/designerStore';
import { TopBar } from '@/features/designer/components/TopBar';
import { ComponentLibrary } from '@/features/designer/components/ComponentLibrary';
import { Canvas } from '@/features/designer/components/Canvas';
import { PropertyPanel } from '@/features/designer/components/PropertyPanel';

const { Content, Sider } = Layout;

export default function DesignerPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const loadSchema = useDesignerStore((s) => s.loadSchema);
  const reset = useDesignerStore((s) => s.reset);

  useEffect(() => {
    if (!formId) {
      navigate('/designer');
      return;
    }
    reset();
  }, [formId, reset, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['form', Number(formId)],
    queryFn: () => designerApi.getForm(Number(formId)),
    enabled: !!formId,
  });

  useEffect(() => {
    if (data) {
      loadSchema({
        formId: data.formId,
        schemaId: data.schemaId,
        formName: data.name,
        targetTable: data.targetTable,
        version: data.version,
        isCurrent: data.isCurrent ?? false,
        fields: data.fields,
        sections: data.sections,
        relationships: data.relationships,
      });
    }
  }, [data, loadSchema]);

  useEffect(() => {
    if (error) {
      message.error('加载失败');
      navigate('/designer');
    }
  }, [error, message, navigate]);

  if (isLoading || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <TopBar />
      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        <Sider width={260} theme="light" style={{ overflow: 'auto' }}>
          <ComponentLibrary />
        </Sider>
        <Content style={{ background: '#f5f5f5', overflow: 'auto' }}>
          <Canvas />
        </Content>
        <Sider width={340} theme="light" style={{ overflow: 'auto' }}>
          <PropertyPanel />
        </Sider>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/pages/Designer/DesignerPage.tsx
git commit -m "feat(designer): add DesignerPage shell with 3-pane layout"
```

---

## Task 3.2: TopBar

**Files:**
- Create: `src/features/designer/components/TopBar.tsx`

- [ ] **Step 1: Create TopBar**

```tsx
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
```

- [ ] **Step 2: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components/TopBar.tsx
git commit -m "feat(designer): add TopBar with save/publish buttons"
```

---

## Task 3.3: ComponentLibrary

**Files:**
- Create: `src/features/designer/components/ComponentLibrary.tsx`
- Create: `src/features/designer/components/ComponentCard.tsx`

- [ ] **Step 1: Create ComponentCard**

```tsx
import { Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface Props {
  type: string;
  label: string;
  emoji: string;
  onAdd: () => void;
}

export function ComponentCard({ type, label, emoji, onAdd }: Props) {
  return (
    <Card
      size="small"
      hoverable
      style={{ marginBottom: 6, cursor: 'grab' }}
      bodyStyle={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}
      data-component-type={type}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      <Button
        type="text"
        size="small"
        icon={<PlusOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Create ComponentLibrary**

```tsx
import { useMemo } from 'react';
import { Collapse, Empty, Input, Tabs } from 'antd';
import { ComponentCard } from './ComponentCard';
import { useDesignerStore } from '@/services/designer/designerStore';

interface ComponentDef {
  type: string;
  label: string;
  emoji: string;
}

const FIELD_CATEGORIES: { title: string; emoji: string; items: ComponentDef[] }[] = [
  {
    title: '文本类', emoji: '📝',
    items: [{ type: 'text', label: '文本', emoji: '📝' }, { type: 'longtext', label: '长文本', emoji: '📄' }],
  },
  {
    title: '数字类', emoji: '🔢',
    items: [{ type: 'number', label: '数字', emoji: '🔢' }],
  },
  {
    title: '日期类', emoji: '📅',
    items: [{ type: 'date', label: '日期', emoji: '📅' }, { type: 'datetime', label: '日期时间', emoji: '🕐' }],
  },
  {
    title: '选择类', emoji: '☑️',
    items: [{ type: 'select', label: '单选', emoji: '☑️' }, { type: 'multiselect', label: '多选', emoji: '🔲' }],
  },
  {
    title: '容器类', emoji: '🧩',
    items: [
      { type: 'section', label: '分组', emoji: '▢' },
      { type: 'subform', label: '子表单', emoji: '📦' },
    ],
  },
  {
    title: '其他', emoji: '📎',
    items: [
      { type: 'boolean', label: '布尔', emoji: '✓' },
      { type: 'file', label: '文件', emoji: '📁' },
      { type: 'reference', label: '引用', emoji: '🔗' },
    ],
  },
];

export function ComponentLibrary() {
  const addField = useDesignerStore((s) => s.addField);
  const formId = useDesignerStore((s) => s.formId);

  const subformList = useDesignerStore((s) => s.draftFields); // not used for now, but tab placeholder

  const handleAdd = (type: string) => {
    if (type === 'subform') {
      // Subform has special handling — open config drawer instead of direct add
      // For now, just add a placeholder; the actual config drawer is Phase 5
      const newField = addField('subform');
      // Open subform config drawer — handled by parent component
    } else {
      addField(type);
    }
  };

  return (
    <Tabs
      defaultActiveKey="fields"
      style={{ padding: '0 8px' }}
      items={[
        {
          key: 'fields',
          label: '字段',
          children: (
            <div>
              {FIELD_CATEGORIES.map((cat) => (
                <Collapse
                  key={cat.title}
                  ghost
                  defaultActiveKey={cat.title}
                  size="small"
                  items={[{
                    key: cat.title,
                    label: <span style={{ fontSize: 13 }}>{cat.emoji} {cat.title}</span>,
                    children: cat.items.map((item) => (
                      <ComponentCard
                        key={item.type}
                        type={item.type}
                        label={item.label}
                        emoji={item.emoji}
                        onAdd={() => handleAdd(item.type)}
                      />
                    )),
                  }]}
                />
              ))}
            </div>
          ),
        },
        {
          key: 'subforms',
          label: '子表单',
          children: (
            <div style={{ padding: 12 }}>
              <Empty
                description="子表单选择器（Phase 5 实现）"
                imageStyle={{ height: 60 }}
              />
              <p style={{ fontSize: 12, color: '#888' }}>
                列出所有可作为子表单的 form。从这里拖入画布。
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
```

- [ ] **Step 3: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components/ComponentLibrary.tsx apps/platform-admin/src/features/designer/components/ComponentCard.tsx
git commit -m "feat(designer): add ComponentLibrary with 6 categories + click-to-add"
```

---

## Task 3.4: Minimal Canvas + PropertyPanel stubs (so shell renders)

**Files:**
- Create: `src/features/designer/components/Canvas.tsx` (minimal)
- Create: `src/features/designer/components/PropertyPanel.tsx` (minimal)
- Create: `src/features/designer/components/PreviewDrawer.tsx` (minimal)

- [ ] **Step 1: Minimal Canvas**

```tsx
import { Empty } from 'antd';
import { useDesignerStore } from '@/services/designer/designerStore';

export function Canvas() {
  const fields = useDesignerStore((s) => s.draftFields);
  if (fields.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Empty description="从左侧组件库拖拽或点击 [+]" />
      </div>
    );
  }
  // Phase 4 will add proper rendering
  return (
    <div style={{ padding: 16 }}>
      {fields.map((f) => (
        <div key={f.id} style={{ background: '#fff', padding: 8, marginBottom: 6, border: '1px solid #f0f0f0' }}>
          {f.name} ({f.type})
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Minimal PropertyPanel**

```tsx
import { Empty } from 'antd';
import { useDesignerStore } from '@/services/designer/designerStore';

export function PropertyPanel() {
  const selectedId = useDesignerStore((s) => s.selectedFieldId);
  const fields = useDesignerStore((s) => s.draftFields);
  const selected = fields.find((f) => f.id === selectedId);

  if (!selected) {
    return (
      <div style={{ padding: 16 }}>
        <Empty description="选中字段查看属性" />
      </div>
    );
  }
  return (
    <div style={{ padding: 16 }}>
      <h3>{selected.name} ({selected.type})</h3>
      <p style={{ color: '#888' }}>Phase 5 将实现完整属性编辑</p>
      <pre>{JSON.stringify(selected, null, 2)}</pre>
    </div>
  );
}
```

- [ ] **Step 3: Minimal PreviewDrawer stub**

```tsx
import { Drawer } from 'antd';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PreviewDrawer({ open, onClose }: Props) {
  return (
    <Drawer title="预览" open={open} onClose={onClose} width="60%">
      <p>Phase 6 实现实时预览</p>
    </Drawer>
  );
}
```

- [ ] **Step 4: Verify typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
git add apps/platform-admin/src/features/designer/components
git commit -m "feat(designer): add minimal Canvas, PropertyPanel, PreviewDrawer stubs"
```

**Phase 3 complete.** Proceed to [Part 4: Canvas + dnd-kit](2026-06-26-form-designer-part4-canvas-dnd.md).
