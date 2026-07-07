import { Fragment, useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDesignerStore } from '@/services/designer/designerStore';
import { CanvasField } from './CanvasField';
import { CanvasSection } from './CanvasSection';
import { SubformContainer } from './SubformContainer';
import { EmptyCanvasDropZone } from './EmptyCanvasDropZone';
import { DeleteDropZone } from './DeleteDropZone';
import { InsertionLine } from './InsertionLine';
import { FieldPreview } from './FieldPreview';
import { LIBRARY_TYPE_META } from '@/features/designer/libraryMeta';
import { buildRenderList } from '@/features/designer/renderList';
import { useQuery } from '@tanstack/react-query';
import { designerApi } from '@/services/designer/designerApi';
import type { SchemaDetailVO } from '@/types/designer';

interface CanvasProps {
  /** Which field the cursor is currently over and whether to insert
   *  before/after it. null when not dragging or not over a field. */
  insertionTarget: { fieldId: string; position: 'before' | 'after' } | null;
  /** Type being dragged from the library (e.g. 'text'), null otherwise.
   *  Used to render a ghost preview at the insertion point. */
  draggingType: string | null;
  /** True when the cursor is over the canvas-empty drop zone at the
   *  bottom of the canvas. Ghost renders at the end in that case. */
  draggingOverEmpty: boolean;
  /** True when the drag will be cancelled (cursor outside any valid
   *  drop target). Hide the ghost — nothing will be inserted. */
  draggingInvalid: boolean;
}

export function Canvas({ insertionTarget, draggingType, draggingOverEmpty, draggingInvalid }: CanvasProps) {
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
            const showLineBefore =
              insertionTarget?.fieldId === f.id && insertionTarget.position === 'before';
            const showLineAfter =
              insertionTarget?.fieldId === f.id && insertionTarget.position === 'after';
            const showGhostBefore =
              !!draggingType && !draggingInvalid && showLineBefore;
            const showGhostAfter =
              !!draggingType && !draggingInvalid && showLineAfter;
            const fieldEl = f.type === 'subform' ? (
              <SubformContainer
                field={f}
                isSelected={f.id === selectedFieldId}
                childFields={getChildFields((f.config?.subformRefId as string) ?? '')}
              />
            ) : (
              <CanvasField field={f} isSelected={f.id === selectedFieldId} />
            );
            return (
              <Fragment key={f.id}>
                {showLineBefore && <InsertionLine active />}
                {showGhostBefore && draggingType && (
                  <div style={{ marginBottom: 4 }}>
                    <FieldPreview
                      emoji={LIBRARY_TYPE_META[draggingType]?.emoji ?? '➕'}
                      label={LIBRARY_TYPE_META[draggingType]?.label ?? draggingType}
                      type={draggingType}
                      opacity={0.55}
                    />
                  </div>
                )}
                {fieldEl}
                {showLineAfter && <InsertionLine active />}
                {showGhostAfter && draggingType && (
                  <div style={{ marginBottom: 4 }}>
                    <FieldPreview
                      emoji={LIBRARY_TYPE_META[draggingType]?.emoji ?? '➕'}
                      label={LIBRARY_TYPE_META[draggingType]?.label ?? draggingType}
                      type={draggingType}
                      opacity={0.55}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </SortableContext>
        {/* Ghost at the very end when dropping on canvas-empty zone. */}
        {draggingType && !draggingInvalid && draggingOverEmpty && (
          <div style={{ marginTop: 4 }}>
            <FieldPreview
              emoji={LIBRARY_TYPE_META[draggingType]?.emoji ?? '➕'}
              label={LIBRARY_TYPE_META[draggingType]?.label ?? draggingType}
              type={draggingType}
              opacity={0.55}
            />
          </div>
        )}
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
