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
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', minHeight: '100%' }}>
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
      <DeleteDropZone />
    </div>
  );
}
