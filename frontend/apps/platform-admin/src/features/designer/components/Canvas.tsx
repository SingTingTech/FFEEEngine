import { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDesignerStore } from '@/services/designer/designerStore';
import { CanvasField } from './CanvasField';
import { CanvasSection } from './CanvasSection';
import { SubformContainer } from './SubformContainer';
import { EmptyCanvasDropZone } from './EmptyCanvasDropZone';
import { DeleteDropZone } from './DeleteDropZone';
import { buildRenderList } from '@/features/designer/renderList';
import { useQuery } from '@tanstack/react-query';
import { designerApi } from '@/services/designer/designerApi';
import type { SchemaDetailVO } from '@/types/designer';

export function Canvas() {
  const fields = useDesignerStore((s) => s.draftFields);
  const sections = useDesignerStore((s) => s.draftSections);
  const selectedFieldId = useDesignerStore((s) => s.selectedFieldId);

  // For subform preview
  const subformRefIds = useMemo(
    () => fields.filter((f) => f.type === 'subform' && f.config?.subformRefId)
                .map((f) => f.config!.subformRefId as string),
    [fields]
  );
  const { data: childSchemas } = useQuery({
    queryKey: ['subform-schemas', subformRefIds],
    queryFn: async () => {
      const results = await Promise.all(subformRefIds.map((id) => designerApi.getForm(id)));
      return results;
    },
    enabled: subformRefIds.length > 0,
  });
  const getChildFields = (subformRefId: string) =>
    childSchemas?.find((s: SchemaDetailVO | undefined) => s?.formId === subformRefId)?.fields ?? [];

  // Sortable items: 字段 id（sortable 关心 field，不关心 section）
  const sortableItems = fields.map((f) => `canvas-field-${f.id}`);

  const renderList = useMemo(() => buildRenderList(fields, sections), [fields, sections]);

  const isEmpty = fields.length === 0;

  return (
    <div
      style={{
        // flex:1 (set on parent Content) + minHeight:0 lets this fill the
        // Content sider without relying on height:100% — antd Content is a
        // flex item with computed (not explicit) height, so percentage
        // heights on its children don't always resolve.
        flex: 1,
        minHeight: 0,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Scrollable middle: fields + empty drop zone. maxWidth centered. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          maxWidth: 900,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {renderList.map((item) => {
            if (item.kind === 'section') {
              return (
                <CanvasSection
                  key={`section-${item.section.id}-${item.fields[0]?.id ?? 'empty'}`}
                  section={item.section}
                  fields={item.fields}
                  selectedFieldId={selectedFieldId}
                />
              );
            }
            const f = item.field;
            if (f.type === 'subform') {
              return (
                <SubformContainer
                  key={f.id}
                  field={f}
                  isSelected={f.id === selectedFieldId}
                  childFields={getChildFields((f.config?.subformRefId as string) ?? '')}
                />
              );
            }
            return <CanvasField key={f.id} field={f} isSelected={f.id === selectedFieldId} />;
          })}
        </SortableContext>
        <EmptyCanvasDropZone empty={isEmpty} />
      </div>
      {/* Delete zone sits below the scrollable pane, always at the bottom
          edge of the canvas, regardless of how many fields are above. */}
      <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <DeleteDropZone />
      </div>
    </div>
  );
}
