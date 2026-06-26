import { Collapse, Empty, Tabs } from 'antd';
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

  const handleAdd = (type: string) => {
    if (type === 'subform') {
      // Subform has special handling — open config drawer instead of direct add
      // For now, just add a placeholder; the actual config drawer is Phase 5
      addField('subform');
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
