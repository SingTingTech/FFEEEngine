import type { FormFieldDefVO, SectionVO } from '@/types/designer';

export type RenderItem =
  | { kind: 'field'; field: FormFieldDefVO }
  | { kind: 'section'; section: SectionVO; fields: FormFieldDefVO[] };

/**
 * 把平面 fields[] 转换为 RenderItem[]。数组顺序即显示顺序；
 * 连续同 sectionId 的字段聚合成一个 section 项。分组字段在数组中
 * 不连续时会在画布上出现多次（接受的行为，详见设计 §3.2）。
 */
export function buildRenderList(
  fields: FormFieldDefVO[],
  sections: SectionVO[]
): RenderItem[] {
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const result: RenderItem[] = [];

  let currentSectionId: string | null | 'INIT' = 'INIT';
  let currentRun: FormFieldDefVO[] = [];

  const flush = () => {
    if (currentRun.length === 0) return;
    if (currentSectionId === null) {
      for (const f of currentRun) result.push({ kind: 'field', field: f });
    } else if (typeof currentSectionId === 'string' && currentSectionId !== 'INIT') {
      const section = sectionById.get(currentSectionId);
      if (section) {
        result.push({ kind: 'section', section, fields: currentRun });
      } else {
        // sectionId 指向不存在的 section（已删除或新建未持久化）
        // 视为根字段，避免丢失数据
        for (const f of currentRun) result.push({ kind: 'field', field: f });
      }
    } else {
      for (const f of currentRun) result.push({ kind: 'field', field: f });
    }
    currentRun = [];
  };

  for (const f of fields) {
    if (f.sectionId !== currentSectionId) {
      flush();
      currentSectionId = f.sectionId;
    }
    currentRun.push(f);
  }
  flush();

  return result;
}
