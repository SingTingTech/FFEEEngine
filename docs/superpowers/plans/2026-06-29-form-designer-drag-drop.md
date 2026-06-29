# Form Designer 拖拽功能增强 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把画布拖拽从"仅画布内重排"升级为"库 → 画布 / 库 → 分组 / 画布内重排 / 跨分组移动 / 拖到画布空白"全场景支持，并提供插入线 + 目标高亮的视觉反馈。

**Architecture:** 纯前端改动。基于 `@dnd-kit/core` + `@dnd-kit/sortable`，不改后端（V5 migration 已支持 `sectionId + sortOrder`）。核心拆分：底层纯函数（`buildRenderList`、`getInsertPosition`）→ store actions（`addFieldAt`、`moveField`）→ React 组件（`ComponentCard` 注册 `useDraggable`、`CanvasField` 切到 `useSortable`、新增 `InsertionLine` + `EmptyCanvasDropZone`）→ `Canvas.tsx` 整合（`closestCorners` collision + `onDragOver` 跟踪 + 扩展 `handleDragEnd`）。

**Tech Stack:** React 18, TypeScript 5.5 strict, AntD 5, Zustand 4, @dnd-kit/core 6.3, @dnd-kit/sortable 10, vitest 2.1.

**Spec:** [docs/superpowers/specs/2026-06-29-form-designer-drag-drop-design.md](../specs/2026-06-29-form-designer-drag-drop-design.md)

**Pre-requisite:** 子项目 3 (Form Designer UI) 已完成，designer 1-9 项 store action 已就绪，`dndHelpers.ts` + `dndHelpers.test.ts` + `designerStore.test.ts` 已存在。

**Conventions:**
- 路径相对 `/home/cris/dev/safeValidator/`
- 提交信息：`(designer): ...`
- 每个 task 提交前 `pnpm --filter platform-admin typecheck` 通过
- 纯函数用 TDD：先写测试 → 看红 → 写实现 → 看绿 → 提交
- React 组件改动：实现 → typecheck → 提交（用组件级测试覆盖关键场景）

---

## Execution Order

| Task | Scope | Output State |
|---|---|---|
| 1 | `buildRenderList` 纯函数 | 数组顺序的连续同组字段聚合成 section 项，可单测 |
| 2 | `dndHelpers.getInsertPosition` 工具函数 | 给出 {sectionId, index, position} 决定插入位置 |
| 3 | store: `addFieldAt` action | 在指定 section / index 插入新字段 |
| 4 | store: `moveField` action | 移动已有字段，支持跨组 |
| 5 | `ComponentCard` 加 `useDraggable` | 库卡片真正可拖 |
| 6 | `CanvasField` 切到 `useSortable` | 字段整卡可拖，去 `⋮⋮` 抓手 |
| 7 | `CanvasSection` `isOver` 高亮 | 拖到分组时高亮 |
| 8 | `InsertionLine` 组件 | 蓝色 2px 横线渲染 |
| 9 | `EmptyCanvasDropZone` 组件 | 画布底部 drop 区 + 高亮 |
| 10 | `Canvas.tsx` 整合 | `buildRenderList` + `onDragOver` + 扩展 `handleDragEnd` + `closestCorners` |
| 11 | 拖动原位 fade | `useSortable.isDragging` 让原字段透明度 0.3 |
| 12 | 手工 E2E 验证 | 浏览器走通 7 个拖拽场景 |

---

## File Structure

### 修改

| 文件 | 改动 |
|---|---|
| `frontend/apps/platform-admin/src/services/designer/designerStore.ts` | 加 `addFieldAt`、`moveField` action |
| `frontend/apps/platform-admin/src/services/designer/dndHelpers.ts` | 加 `getInsertPosition` + `getInsertionTarget`（内部 helper） |
| `frontend/apps/platform-admin/src/features/designer/components/ComponentCard.tsx` | 加 `useDraggable` |
| `frontend/apps/platform-admin/src/features/designer/components/CanvasField.tsx` | 切到 `useSortable`、去抓手、加 isDragging fade |
| `frontend/apps/platform-admin/src/features/designer/components/CanvasSection.tsx` | 监听 `isOver` 改背景 + 边框 |
| `frontend/apps/platform-admin/src/features/designer/components/Canvas.tsx` | 整合 buildRenderList、InsertionLine、EmptyCanvasDropZone、扩展 handleDragEnd |
| `frontend/apps/platform-admin/src/services/designer/designerStore.test.ts` | 加 `addFieldAt`、`moveField` 单元测试 |
| `frontend/apps/platform-admin/src/services/designer/dndHelpers.test.ts` | 加 `getInsertPosition` 单元测试 |

### 新增

| 文件 | 职责 |
|---|---|
| `frontend/apps/platform-admin/src/features/designer/renderList.ts` | `buildRenderList` 纯函数：把 `fields[] + sections[]` 转 `RenderItem[]` |
| `frontend/apps/platform-admin/src/features/designer/renderList.test.ts` | `buildRenderList` 单元测试 |
| `frontend/apps/platform-admin/src/features/designer/components/InsertionLine.tsx` | 蓝色 2px 横线组件 |
| `frontend/apps/platform-admin/src/features/designer/components/EmptyCanvasDropZone.tsx` | 画布底部 drop 区 + 高亮 |

---

## Task 1: `buildRenderList` 纯函数 + 单元测试

**Files:**
- Create: `frontend/apps/platform-admin/src/features/designer/renderList.ts`
- Create: `frontend/apps/platform-admin/src/features/designer/renderList.test.ts`

**Background:** `fields[]` 是平面的，每个字段有 `sectionId: string | null`。`buildRenderList` 把数组中**连续同组**的字段聚合成一个 `section` 项，根字段仍然是 `field` 项。

- [ ] **Step 1: Write the failing test**

在 `renderList.test.ts` 写：

```typescript
import { describe, it, expect } from 'vitest';
import { buildRenderList } from './renderList';
import type { FormFieldDefVO, SectionVO } from '@/types/designer';

const field = (id: string, sectionId: string | null = null): FormFieldDefVO => ({
  id, schemaId: '100', code: id, name: id, type: 'text',
  required: false, defaultValue: null, sortOrder: 0,
  config: null, validation: null, targetColumn: null,
  sectionId, isLinkField: false,
  createTime: '', updateTime: '',
});

const section = (id: string): SectionVO => ({
  id, schemaId: '100', name: id, description: null, sortOrder: 0,
  createTime: '', updateTime: '',
});

describe('buildRenderList', () => {
  it('空 fields 返回空数组', () => {
    expect(buildRenderList([], [])).toEqual([]);
  });

  it('全部是根字段', () => {
    const result = buildRenderList(
      [field('a'), field('b'), field('c')],
      []
    );
    expect(result).toEqual([
      { kind: 'field', field: expect.objectContaining({ id: 'a' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'b' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'c' }) },
    ]);
  });

  it('单个分组连续 → 一个 section 项', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('b', 's1'), field('c', 's1')],
      [section('s1')]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: 'section',
      section: expect.objectContaining({ id: 's1' }),
      fields: [expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b' }), expect.objectContaining({ id: 'c' })],
    });
  });

  it('分组分散在根字段之间 → 出现多次', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('b', null), field('c', 's1')],
      [section('s1')]
    );
    expect(result).toEqual([
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'a' })] },
      { kind: 'field', field: expect.objectContaining({ id: 'b' }) },
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'c' })] },
    ]);
  });

  it('多分组交错', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('b', 's2'), field('c', 's1')],
      [section('s1'), section('s2')]
    );
    expect(result.map((r) => r.kind)).toEqual(['section', 'section', 'section']);
    expect(result[0]).toMatchObject({ kind: 'section', section: expect.objectContaining({ id: 's1' }) });
    expect(result[1]).toMatchObject({ kind: 'section', section: expect.objectContaining({ id: 's2' }) });
    expect(result[2]).toMatchObject({ kind: 'section', section: expect.objectContaining({ id: 's1' }) });
  });

  it('引用不存在的 sectionId → 视为 root', () => {
    const result = buildRenderList(
      [field('a', 'ghost'), field('b', null)],
      [section('s1')]
    );
    expect(result).toEqual([
      { kind: 'field', field: expect.objectContaining({ id: 'a' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'b' }) },
    ]);
  });

  it('多个根字段夹在分组之间', () => {
    const result = buildRenderList(
      [field('a', 's1'), field('x', null), field('y', null), field('b', 's1')],
      [section('s1')]
    );
    expect(result).toEqual([
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'a' })] },
      { kind: 'field', field: expect.objectContaining({ id: 'x' }) },
      { kind: 'field', field: expect.objectContaining({ id: 'y' }) },
      { kind: 'section', section: expect.objectContaining({ id: 's1' }), fields: [expect.objectContaining({ id: 'b' })] },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- renderList.test.ts --run
```

预期：FAIL（模块不存在）。

- [ ] **Step 3: Implement `buildRenderList`**

在 `renderList.ts`：

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- renderList.test.ts --run
```

预期：7 个 test 全部 PASS。

- [ ] **Step 5: Typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/renderList.ts \
        frontend/apps/platform-admin/src/features/designer/renderList.test.ts
git commit -m "feat(designer): add buildRenderList pure function"
```

---

## Task 2: `dndHelpers.getInsertPosition` 工具函数 + 单元测试

**Files:**
- Modify: `frontend/apps/platform-admin/src/services/designer/dndHelpers.ts`
- Modify: `frontend/apps/platform-admin/src/services/designer/dndHelpers.test.ts`

**Background:** Cursor-based 上下判定 —— 给定 `over.rect` 和 `cursorY`，返回 `'before' | 'after'`。`over.rect` 来自 dnd-kit 的 `over.rect`（droppable 元素的 bounding rect）。

- [ ] **Step 1: Write the failing test**

在 `dndHelpers.test.ts` 末尾追加：

```typescript
import { getInsertPosition } from './dndHelpers';

// ... 已有 describe('dndHelpers', ...) 内部新增 describe

describe('getInsertPosition', () => {
  // over.rect: { top: 100, height: 80 }  → midY = 140
  const overRect = { top: 100, height: 80 };

  it('cursor 在 over 上半 → before', () => {
    expect(getInsertPosition(overRect, 120)).toBe('before');
  });

  it('cursor 在 over 下半 → after', () => {
    expect(getInsertPosition(overRect, 160)).toBe('after');
  });

  it('cursor 在 midY 之上（不含）→ before', () => {
    expect(getInsertPosition(overRect, 139)).toBe('before');
  });

  it('cursor 在 midY 之上（含）→ before（边界选 before，保持一致）', () => {
    expect(getInsertPosition(overRect, 140)).toBe('before');
  });

  it('cursor 在 midY 之下 → after', () => {
    expect(getInsertPosition(overRect, 141)).toBe('after');
  });

  it('zero-height rect → 视为 before（退化情况）', () => {
    expect(getInsertPosition({ top: 100, height: 0 }, 100)).toBe('before');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- dndHelpers.test.ts --run
```

预期：FAIL（`getInsertPosition` 未导出）。

- [ ] **Step 3: Implement `getInsertPosition`**

在 `dndHelpers.ts` 末尾追加：

```typescript
import type { ClientRect } from '@dnd-kit/core';

/**
 * Cursor-based 上下判定：cursor 在 over 中线（不含）之上 → 'before'，
 * 在中线（含）之下 → 'after'。over.rect 来自 dnd-kit 的 over.rect。
 */
export function getInsertPosition(
  overRect: Pick<ClientRect, 'top' | 'height'>,
  cursorY: number
): 'before' | 'after' {
  if (overRect.height === 0) return 'before';
  const midY = overRect.top + overRect.height / 2;
  return cursorY < midY ? 'before' : 'after';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- dndHelpers.test.ts --run
```

预期：所有 dndHelpers 测试 PASS。

- [ ] **Step 5: Typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/services/designer/dndHelpers.ts \
        frontend/apps/platform-admin/src/services/designer/dndHelpers.test.ts
git commit -m "feat(designer): add getInsertPosition for cursor-based drop placement"
```

---

## Task 3: store `addFieldAt` action + 单元测试

**Files:**
- Modify: `frontend/apps/platform-admin/src/services/designer/designerStore.ts`
- Modify: `frontend/apps/platform-admin/src/services/designer/designerStore.test.ts`

**Background:** `addField(type, atIndex?)` 是 v1 的"加到根字段 atIndex 或末尾"。`addFieldAt(type, sectionId, index)` 升级为：在 `fields[]` 数组的 `index` 位置插入新字段，设 `sectionId`。`sectionId=null` 表示加到根字段（按数组顺序的根字段段）。

`index` 语义：数组中的位置（不是该 section 内的相对位置）。

- [ ] **Step 1: Write the failing test**

在 `designerStore.test.ts` 末尾追加：

```typescript
describe('addFieldAt', () => {
  it('sectionId=null 在数组末尾追加根字段', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().addFieldAt('text', null, 2);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(3);
    expect(fields[2].type).toBe('text');
    expect(fields[2].sectionId).toBeNull();
  });

  it('sectionId=null 在中间插入根字段', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().addFieldAt('number', null, 1);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields.map((f) => f.id)).toEqual(['1', expect.stringMatching(/^tmp-\d+$/), '2']);
  });

  it('sectionId="s1" 插入到分组末尾', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1', sectionId: 's1' }), sampleField({ id: '2' })],
      sections: [sampleSection({ id: 's1' })], relationships: [],
    });
    useDesignerStore.getState().addFieldAt('date', 's1', 1);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(3);
    expect(fields[1].type).toBe('date');
    expect(fields[1].sectionId).toBe('s1');
  });

  it('addFieldAt 标 isDirty 并 select 新字段', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true, fields: [], sections: [], relationships: [],
    });
    const created = useDesignerStore.getState().addFieldAt('text', null, 0);
    const state = useDesignerStore.getState();
    expect(state.isDirty).toBe(true);
    expect(state.selectedFieldId).toBe(created.id);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- designerStore.test.ts --run
```

预期：FAIL（`addFieldAt` 未定义）。

- [ ] **Step 3: Implement `addFieldAt`**

在 `designerStore.ts` 的 `DesignerState` interface 中：

```typescript
  addFieldAt: (type: string, sectionId: string | null, index: number) => FormFieldDefVO;
```

在 `addField` action 后实现 `addFieldAt`：

```typescript
  addFieldAt: (type, sectionId, index) => {
    const newField: FormFieldDefVO = {
      id: nextTempId(),
      schemaId: '0',
      code: `${type}_${Date.now()}`,
      name: type,
      type,
      required: false,
      defaultValue: null,
      sortOrder: 0,
      config: null,
      validation: null,
      targetColumn: null,
      sectionId,
      isLinkField: false,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    set((state) => {
      const fields = [...state.draftFields];
      const clampedIndex = Math.max(0, Math.min(index, fields.length));
      fields.splice(clampedIndex, 0, newField);
      return { draftFields: fields, isDirty: true, selectedFieldId: newField.id };
    });
    return newField;
  },
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- designerStore.test.ts --run
```

预期：所有 designerStore 测试 PASS。

- [ ] **Step 5: Typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/services/designer/designerStore.ts \
        frontend/apps/platform-admin/src/services/designer/designerStore.test.ts
git commit -m "feat(designer): add addFieldAt store action"
```

---

## Task 4: store `moveField` action + 单元测试

**Files:**
- Modify: `frontend/apps/platform-admin/src/services/designer/designerStore.ts`
- Modify: `frontend/apps/platform-admin/src/services/designer/designerStore.test.ts`

**Background:** `moveField(fieldId, targetSectionId, targetIndex)`：从 `fields[]` 移除 `fieldId` 字段，在新 `targetIndex` 位置插入，更新 `sectionId`。`sectionId` 与新位置一致时为同组重排，不一致时为跨组移动。

- [ ] **Step 1: Write the failing test**

在 `designerStore.test.ts` 末尾追加：

```typescript
describe('moveField', () => {
  it('同组内重排', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' }), sampleField({ id: '3' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 2);
    expect(useDesignerStore.getState().draftFields.map((f) => f.id)).toEqual(['2', '3', '1']);
    expect(useDesignerStore.getState().draftFields[2].sectionId).toBeNull();
  });

  it('跨组移动 - 根 → 分组', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [
        sampleField({ id: '1' }),
        sampleField({ id: '2', sectionId: 's1' }),
      ],
      sections: [sampleSection({ id: 's1' })], relationships: [],
    });
    useDesignerStore.getState().moveField('1', 's1', 2);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(2);
    expect(fields[1].id).toBe('1');
    expect(fields[1].sectionId).toBe('s1');
  });

  it('跨组移动 - 分组 → 根', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [
        sampleField({ id: '1', sectionId: 's1' }),
        sampleField({ id: '2' }),
      ],
      sections: [sampleSection({ id: 's1' })], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 1);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields[0].id).toBe('1');
    expect(fields[0].sectionId).toBeNull();
  });

  it('分组 A → 分组 B', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [
        sampleField({ id: '1', sectionId: 's1' }),
        sampleField({ id: '2', sectionId: 's2' }),
      ],
      sections: [sampleSection({ id: 's1' }), sampleSection({ id: 's2' })],
      relationships: [],
    });
    useDesignerStore.getState().moveField('1', 's2', 2);
    const fields = useDesignerStore.getState().draftFields;
    expect(fields).toHaveLength(2);
    expect(fields[1].id).toBe('1');
    expect(fields[1].sectionId).toBe('s2');
  });

  it('移动到末尾（targetIndex 越界）→ 插入到末尾', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 99);
    expect(useDesignerStore.getState().draftFields.map((f) => f.id)).toEqual(['2', '1']);
  });

  it('不存在的 fieldId → no-op', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('ghost', null, 1);
    expect(useDesignerStore.getState().draftFields).toHaveLength(1);
  });

  it('moveField 标 isDirty', () => {
    useDesignerStore.getState().loadSchema({
      formId: '1', schemaId: '100', formName: 'f', targetTable: null,
      version: 1, isCurrent: true,
      fields: [sampleField({ id: '1' }), sampleField({ id: '2' })],
      sections: [], relationships: [],
    });
    useDesignerStore.getState().moveField('1', null, 2);
    expect(useDesignerStore.getState().isDirty).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- designerStore.test.ts --run
```

预期：FAIL（`moveField` 未定义）。

- [ ] **Step 3: Implement `moveField`**

在 `designerStore.ts` 的 `DesignerState` interface 中：

```typescript
  moveField: (fieldId: string, targetSectionId: string | null, targetIndex: number) => void;
```

在 `addFieldAt` action 后实现 `moveField`：

```typescript
  moveField: (fieldId, targetSectionId, targetIndex) => {
    set((state) => {
      const idx = state.draftFields.findIndex((f) => f.id === fieldId);
      if (idx === -1) return state;
      const fields = [...state.draftFields];
      const [moved] = fields.splice(idx, 1);
      const updated = { ...moved, sectionId: targetSectionId };
      const clampedIndex = Math.max(0, Math.min(targetIndex, fields.length));
      fields.splice(clampedIndex, 0, updated);
      return { draftFields: fields, isDirty: true };
    });
  },
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- designerStore.test.ts --run
```

预期：所有 designerStore 测试 PASS。

- [ ] **Step 5: Typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/services/designer/designerStore.ts \
        frontend/apps/platform-admin/src/services/designer/designerStore.test.ts
git commit -m "feat(designer): add moveField store action with cross-section support"
```

---

## Task 5: `ComponentCard` 加 `useDraggable`

**Files:**
- Modify: `frontend/apps/platform-admin/src/features/designer/components/ComponentCard.tsx`

**Background:** v1 库卡片设了 `cursor: 'grab'` 但没注册 `useDraggable`，所以拖不动。加 `useDraggable({ id: 'library-${type}', data: { source: 'library', type } })` 让库卡片真正可拖。

- [ ] **Step 1: Replace `ComponentCard.tsx` with useDraggable version**

```tsx
import { Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  type: string;
  label: string;
  emoji: string;
  onAdd: () => void;
}

export function ComponentCard({ type, label, emoji, onAdd }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `library-${type}`,
    data: { source: 'library', type },
  });

  return (
    <Card
      size="small"
      hoverable
      ref={setNodeRef}
      style={{
        marginBottom: 6,
        cursor: 'grab',
        transform: CSS.Translate.toString(transform),
      }}
      styles={{ body: { padding: 8, display: 'flex', alignItems: 'center', gap: 8 } }}
      data-component-type={type}
      {...attributes}
      {...listeners}
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

- [ ] **Step 2: Typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
```

预期：PASS（无 type 错误）。

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/components/ComponentCard.tsx
git commit -m "feat(designer): register useDraggable on ComponentCard so library cards can be dragged"
```

---

## Task 6: `CanvasField` 切到 `useSortable`、去抓手、加 isDragging fade

**Files:**
- Modify: `frontend/apps/platform-admin/src/features/designer/components/CanvasField.tsx`

**Background:**
- v1 用 `useDraggable + useDroppable`，`SortableContext` 没真正起作用。
- 切到 `useSortable` 让字段可被 SortableContext 管理（动画 + 跨组移动 + 同组重排统一用一套机制）。
- 整张卡可拖：监听器加到 Card 整体。
- 去除 `⋮⋮` 抓手 span。
- `isDragging` 时原位置透明度 0.3（DragOverlay 显示副本）。

- [ ] **Step 1: Replace `CanvasField.tsx` with useSortable version**

```tsx
import { Button, Card, Dropdown, Tag } from 'antd';
import { DeleteOutlined, CopyOutlined, MoreOutlined } from '@ant-design/icons';
import { useDesignerStore } from '@/services/designer/designerStore';
import { FieldTypeIcon } from './FieldTypeIcon';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormFieldDefVO } from '@/types/designer';

interface Props {
  field: FormFieldDefVO;
  isSelected: boolean;
}

export function CanvasField({ field, isSelected }: Props) {
  const selectField = useDesignerStore((s) => s.selectField);
  const removeField = useDesignerStore((s) => s.removeField);
  const addField = useDesignerStore((s) => s.addField);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `canvas-field-${field.id}`,
    data: { source: 'canvas', fieldId: field.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 6,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        size="small"
        hoverable
        style={{
          borderColor: isSelected ? '#1677ff' : undefined,
          background: isSelected ? '#e6f4ff' : '#fff',
          cursor: 'grab',
        }}
        styles={{ body: { padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 } }}
        onClick={() => selectField(field.id)}
      >
        <FieldTypeIcon type={field.type} />
        <span style={{ flex: 1, fontWeight: field.required ? 600 : 400 }}>{field.name || field.code}</span>
        <Tag>{field.type}</Tag>
        {field.required && <Tag color="red">必填</Tag>}
        {field.isLinkField && <Tag color="purple">链接字段</Tag>}
        {field.targetColumn && <Tag color="cyan">→ {field.targetColumn}</Tag>}
        <Dropdown
          menu={{
            items: [
              { key: 'duplicate', icon: <CopyOutlined />, label: '复制', onClick: () => {
                addField(field.type);
              }},
              { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => {
                removeField(field.id);
              }},
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
```

预期：PASS。

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/components/CanvasField.tsx
git commit -m "refactor(designer): switch CanvasField to useSortable, drop drag handle, fade on drag"
```

---

## Task 7: `CanvasSection` `isOver` 高亮（背景 + 边框）

**Files:**
- Modify: `frontend/apps/platform-admin/src/features/designer/components/CanvasSection.tsx`

**Background:** v1 有 `useDroppable` 但只是 `opacity: isOver ? 0.7`。改成：默认背景 `#fffbe6`、边框 `#faad14`；`isOver` 时背景 `#e6f4ff`、边框 `#1677ff`。

- [ ] **Step 1: Replace `CanvasSection.tsx` with highlight-aware version**

```tsx
import { Dropdown, Tag, Button } from 'antd';
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useDesignerStore } from '@/services/designer/designerStore';
import type { SectionVO, FormFieldDefVO } from '@/types/designer';
import { CanvasField } from './CanvasField';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  section: SectionVO;
  fields: FormFieldDefVO[];
  selectedFieldId: string | null;
}

export function CanvasSection({ section, fields, selectedFieldId }: Props) {
  const removeSection = useDesignerStore((s) => s.removeSection);
  const updateSection = useDesignerStore((s) => s.updateSection);

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `canvas-section-${section.id}`,
    data: { source: 'canvas-section', sectionId: section.id },
  });

  return (
    <div
      ref={dropRef}
      style={{
        marginBottom: 8,
        border: `2px dashed ${isOver ? '#1677ff' : '#faad14'}`,
        background: isOver ? '#e6f4ff' : '#fffbe6',
        borderRadius: 4,
        padding: 6,
        transition: 'all 0.15s',
      }}
    >
      <header
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px' }}
        onClick={() => updateSection(section.id, {})}
      >
        <span>▾</span>
        <b>{section.name}</b>
        <Tag>分组</Tag>
        <span style={{ flex: 1 }} />
        <Dropdown
          menu={{
            items: [
              { key: 'rename', label: '重命名', onClick: () => {
                const name = prompt('分组名', section.name);
                if (name) updateSection(section.id, { name });
              }},
              { key: 'delete', icon: <DeleteOutlined />, label: '删除分组', danger: true, onClick: () => {
                if (confirm('删除分组（字段不会被删除，会移到画布根）?')) {
                  removeSection(section.id);
                }
              }},
            ],
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      </header>
      <div style={{ paddingLeft: 16 }}>
        {fields.map((f) => (
          <CanvasField key={f.id} field={f} isSelected={f.id === selectedFieldId} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
```

预期：PASS。

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/components/CanvasSection.tsx
git commit -m "feat(designer): highlight CanvasSection when dragged over"
```

---

## Task 8: `InsertionLine` 组件

**Files:**
- Create: `frontend/apps/platform-admin/src/features/designer/components/InsertionLine.tsx`

**Background:** 蓝色 2px 横线。Props: `{ active: boolean }`。`Canvas` 用 `onDragOver` 计算位置，然后渲染 0 个或 1 个 `InsertionLine`。

- [ ] **Step 1: Create `InsertionLine.tsx`**

```tsx
interface Props {
  active: boolean;
}

export function InsertionLine({ active }: Props) {
  if (!active) return null;
  return (
    <div
      style={{
        height: 2,
        background: '#1677ff',
        borderRadius: 1,
        margin: '2px 0',
        pointerEvents: 'none',
      }}
      data-testid="insertion-line"
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
```

预期：PASS。

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/components/InsertionLine.tsx
git commit -m "feat(designer): add InsertionLine component for drag position feedback"
```

---

## Task 9: `EmptyCanvasDropZone` 组件

**Files:**
- Create: `frontend/apps/platform-admin/src/features/designer/components/EmptyCanvasDropZone.tsx`

**Background:** 画布底部 drop 区。两种使用场景：
- 画布非空：渲染 30px 高的占位区
- 画布为空：渲染更大的占位 + 提示文案

`isOver` 时：背景 `#f0f8ff`、顶部 1px 蓝线。

- [ ] **Step 1: Create `EmptyCanvasDropZone.tsx`**

```tsx
import { useDroppable } from '@dnd-kit/core';

interface Props {
  empty: boolean;
}

export function EmptyCanvasDropZone({ empty }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-empty',
    data: { source: 'canvas-empty' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        height: empty ? 200 : 30,
        marginTop: 8,
        borderTop: isOver ? '2px solid #1677ff' : empty ? 'none' : '1px dashed #d9d9d9',
        background: isOver ? '#f0f8ff' : 'transparent',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: 13,
        transition: 'all 0.15s',
      }}
    >
      {empty && (isOver ? '松开加到末尾' : '从左侧组件库拖拽或点击 [+]')}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
```

预期：PASS。

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/components/EmptyCanvasDropZone.tsx
git commit -m "feat(designer): add EmptyCanvasDropZone with over highlight"
```

---

## Task 10: `Canvas.tsx` 整合 — `buildRenderList` + `onDragOver` + 扩展 `handleDragEnd` + `closestCorners`

**Files:**
- Modify: `frontend/apps/platform-admin/src/features/designer/components/Canvas.tsx`

**Background:** 这是最复杂的一步。Canvas 需要：
1. 用 `buildRenderList` 渲染（替代当前的 sections-first-then-rootFields 模式）
2. `DndContext.collisionDetection = closestCorners`（更精确）
3. `onDragOver` 跟踪 `over.rect` + cursorY → 算 position → 决定 `InsertionLine` 渲染位置
4. 扩展 `handleDragEnd` 支持 4 种 over 目标：field、section、empty、null
5. 用 `addFieldAt` 替换 `addField`（库拖拽）
6. 用 `moveField` 替换 `reorderFields`（画布内拖拽）
7. 保留 `<DragOverlay>` 显示拖动预览

由于 onDragOver 需要在每帧跟踪位置，需要 state `dragOver: { overId, position } | null`。

为了 InsertionLine 渲染位置准确，把 `InsertionLine` 放在合适的位置：字段之间用 `useSortable` 的 field 间位置自动由 dnd-kit 渲染，**但跨组移动**或**拖到末尾**时仍需要手动 InsertionLine。简化方案：**在 `CanvasField` 上方/下方** 用 inline 渲染（通过 `data-position` 在 children 中插入），或**用 `useDroppable` 配合排序时 dnd-kit 自动渲染**。

**v1.1 简化方案**：不实现实时 inline InsertionLine（在字段之间）。只实现：
- Section 框 `isOver` 高亮（Task 7 已做）
- EmptyCanvasDropZone `isOver` 高亮（Task 9 已做）
- DragOverlay 显示拖动预览（v1 已有）

这样 UX 已经能告诉用户"会落到哪"——目标高亮本身就是插入位置反馈。inline 插入线作为 v1.2 优化。

- [ ] **Step 1: Replace `Canvas.tsx` with integrated version**

```tsx
import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDesignerStore } from '@/services/designer/designerStore';
import { CanvasField } from './CanvasField';
import { CanvasSection } from './CanvasSection';
import { SubformContainer } from './SubformContainer';
import { EmptyCanvasDropZone } from './EmptyCanvasDropZone';
import { InsertionLine } from './InsertionLine';
import { isLibraryDrag, isCanvasDrag } from '@/services/designer/dndHelpers';
import { buildRenderList } from '@/features/designer/renderList';
import { useQuery } from '@tanstack/react-query';
import { designerApi } from '@/services/designer/designerApi';
import type { SchemaDetailVO } from '@/types/designer';

export function Canvas() {
  const fields = useDesignerStore((s) => s.draftFields);
  const sections = useDesignerStore((s) => s.draftSections);
  const selectedFieldId = useDesignerStore((s) => s.selectedFieldId);
  const addFieldAt = useDesignerStore((s) => s.addFieldAt);
  const moveField = useDesignerStore((s) => s.moveField);

  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);

  // For subform preview
  const subformRefIds = useMemo(
    () => fields.filter((f) => f.type === 'subform' && f.config?.subformRefId)
                .map((f) => f.config!.subformRefId as number),
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
  const getChildFields = (subformRefId: number) =>
    childSchemas?.find((s: SchemaDetailVO | undefined) => s?.formId === subformRefId)?.fields ?? [];

  // Sortable items: 字段 id（sortable 关心 field，不关心 section）
  const sortableItems = fields.map((f) => `canvas-field-${f.id}`);

  const renderList = useMemo(() => buildRenderList(fields, sections), [fields, sections]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const lib = isLibraryDrag(String(event.active.id));
    if (lib) setDraggingType(lib.type);
    const canvasFieldId = isCanvasDrag(String(event.active.id));
    if (canvasFieldId !== null) setDraggingFieldId(canvasFieldId);
  };

  const handleDragCancel = () => {
    setDraggingType(null);
    setDraggingFieldId(null);
  };

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    setDraggingType(null);
    setDraggingFieldId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const activeId = String(active.id);

    // 库 → 画布
    const lib = isLibraryDrag(activeId);
    if (lib) {
      // 1. over 是字段
      const overField = isCanvasDrag(overId);
      if (overField !== null) {
        const overIdx = fields.findIndex((f) => f.id === overField);
        if (overIdx === -1) return;
        const overFieldObj = fields[overIdx];
        // 用 cursor 位置：这里简化为 'after'（落到 over 字段之后）
        // 真要 cursor-based 判定需要 onDragOver 跟踪位置，由 v1.2 实现
        addFieldAt(lib.type, overFieldObj.sectionId, overIdx + 1);
        return;
      }
      // 2. over 是分组
      if (overId.startsWith('canvas-section-')) {
        const sectionId = overId.replace('canvas-section-', '');
        const lastSectionIdx = lastIndexOfSection(fields, sectionId);
        addFieldAt(lib.type, sectionId, lastSectionIdx + 1);
        return;
      }
      // 3. over 是画布空白
      if (overId === 'canvas-empty') {
        addFieldAt(lib.type, null, fields.length);
        return;
      }
      return;
    }

    // 画布 → 画布
    const fromId = isCanvasDrag(activeId);
    if (fromId === null) return;
    const toId = isCanvasDrag(overId);
    if (toId !== null) {
      if (fromId === toId) return; // no-op
      const fromIdx = fields.findIndex((f) => f.id === fromId);
      const toIdx = fields.findIndex((f) => f.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      const target = fields[toIdx];
      moveField(fromId, target.sectionId, toIdx + (fromIdx < toIdx ? 1 : 0));
      return;
    }
    if (overId.startsWith('canvas-section-')) {
      const sectionId = overId.replace('canvas-section-', '');
      const lastSectionIdx = lastIndexOfSection(fields, sectionId);
      moveField(fromId, sectionId, lastSectionIdx + 1);
      return;
    }
    if (overId === 'canvas-empty') {
      moveField(fromId, null, fields.length);
      return;
    }
  };

  const isEmpty = fields.length === 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
                  childFields={getChildFields((f.config?.subformRefId as number) ?? 0)}
                />
              );
            }
            return <CanvasField key={f.id} field={f} isSelected={f.id === selectedFieldId} />;
          })}
        </SortableContext>
        <EmptyCanvasDropZone empty={isEmpty} />
      </div>
      <DragOverlay>
        {draggingType && (
          <div style={{
            background: '#fff', padding: '6px 12px',
            border: '2px solid #1677ff', borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            opacity: 0.9,
          }}>
            + {draggingType}
          </div>
        )}
        {draggingFieldId && (() => {
          const field = fields.find((f) => f.id === draggingFieldId);
          if (!field) return null;
          return (
            <div style={{
              background: '#fff', padding: '6px 12px',
              border: '2px solid #1677ff', borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: 0.9,
            }}>
              {field.name || field.code} <small style={{ color: '#888' }}>({field.type})</small>
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}

// 工具：找到最后一个 sectionId === sectionId 的字段索引
function lastIndexOfSection(fields: { sectionId: string | null }[], sectionId: string): number {
  for (let i = fields.length - 1; i >= 0; i--) {
    if (fields[i].sectionId === sectionId) return i;
  }
  return -1;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
```

预期：PASS。

- [ ] **Step 3: Run all designer tests**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin test -- --run
```

预期：所有测试 PASS。

- [ ] **Step 4: Commit**

```bash
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/components/Canvas.tsx
git commit -m "feat(designer): integrate buildRenderList, closestCorners, expanded handleDragEnd, DropOverlay previews"
```

---

## Task 11: 删 CanvasField 中的 `data-position` 占位（v1.1 简化版的收尾）

**Files:**
- 无（Task 8 已创建 `InsertionLine` 但 v1.1 暂不在 Canvas 中插入它；如果需要 v1.2 再做）

**Background:** v1.1 简化方案：靠 Section 框 `isOver` 高亮 + EmptyCanvasDropZone `isOver` 高亮 + DragOverlay 预览来告诉用户"会落到哪"。inline InsertionLine 暂不集成。`InsertionLine` 组件已创建（Task 8），但 Canvas.tsx 没有 import 它。

如果想在 v1.1 末再加 inline 插入线：在 `CanvasField` 之间用 `onDragOver` 跟踪 + `closestCorners` 计算位置 + 把 `InsertionLine` 插到合适位置。本任务**暂不实现**——只是确认 v1.1 不使用 `InsertionLine`。

- [ ] **Step 1: 确认 `InsertionLine` 没被 Canvas 引用**

```bash
cd /home/cris/dev/safeValidator
grep -n "InsertionLine" frontend/apps/platform-admin/src/features/designer/components/Canvas.tsx
```

预期：无输出。

- [ ] **Step 2: 在 InsertionLine.tsx 顶部加注释说明 v1.1 暂未使用**

```tsx
// InsertionLine — v1.1: 组件已就绪但 Canvas 未集成（依赖 onDragOver tracking），
// 视觉反馈靠 Section 框 + EmptyCanvasDropZone 的 isOver 高亮 + DragOverlay 预览。
// v1.2 再把 InsertionLine 集成进 Canvas，实现 inline 字段间插入线。
interface Props {
  active: boolean;
}

export function InsertionLine({ active }: Props) {
  if (!active) return null;
  return (
    <div
      style={{
        height: 2,
        background: '#1677ff',
        borderRadius: 1,
        margin: '2px 0',
        pointerEvents: 'none',
      }}
      data-testid="insertion-line"
    />
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm --filter platform-admin typecheck
cd /home/cris/dev/safeValidator
git add frontend/apps/platform-admin/src/features/designer/components/InsertionLine.tsx
git commit -m "docs(designer): mark InsertionLine as ready but not integrated in v1.1"
```

---

## Task 12: 手工 E2E 浏览器验证

**Files:** 无（手工）

**Background:** v1 没有 Playwright E2E（虽然设计稿提到，但 v1.1 暂不做 Playwright 脚本）。手工在浏览器走 7 个场景。

**Pre-requisite:** 启动后端（`mvn clean install` + fitech-war `mvn jetty:run`）和前端（`pnpm dev`）。

- [ ] **Step 1: 启动环境**

后端（容器中）：
```bash
docker exec -it <maven-container> bash -c "cd /app && mvn clean install -DskipTests"
docker exec -it <maven-container> bash -c "cd /app/fitech-war && mvn clean package jetty:run"
```

前端（容器中）：
```bash
docker exec -it <platform-react-container> bash -c "cd /app && yarn dev"
```

打开浏览器 → 登录 → 进入表单设计器 → 选择或创建一个新表单。

- [ ] **Step 2: 场景 1 — 库 → 画布空白**

- 创建新表单（无字段）
- 从左侧"文本"卡片拖到画布底部
- 验证：画布出现 1 个文本字段，selectedFieldId 指向它

- [ ] **Step 3: 场景 2 — 库 → 字段**

- 已有 1 个文本字段
- 从左侧"数字"卡片拖到文本字段的下半部
- 验证：画布有 2 个字段，顺序为 [文本, 数字]

- [ ] **Step 4: 场景 3 — 库 → 分组**

- 从左侧"分组"卡片 [+]，画布出现分组框
- 从左侧"日期"卡片拖到分组框内
- 验证：日期字段在分组内（DOM 中是分组 div 的子元素）

- [ ] **Step 5: 场景 4 — 画布内重排**

- 已有 [A, B, C] 三个字段（根）
- 拖 A 到 B 的上半部
- 验证：顺序变为 [B, A, C]

- [ ] **Step 6: 场景 5 — 跨组移动**

- 已有 分组1: [A]、根: [B]、分组2: [C]
- 拖 A 到分组2 内
- 验证：A 出现在分组2 末尾，A 的 `sectionId` 改变

- [ ] **Step 7: 场景 6 — 移出分组**

- 拖 A（分组内）到根字段区域
- 验证：A 出现在根字段段，A 的 `sectionId=null`

- [ ] **Step 8: 场景 7 — 拖到画布空白**

- 已有根字段若干
- 拖任意字段到画布底部 EmptyCanvasDropZone
- 验证：该字段移到根字段末尾

- [ ] **Step 9: 边界验证**

- 拖一个分组字段到画布空白 → 字段移到根字段末尾（sectionId 变为 null）✓
- 整张字段卡可拖（不再有 `⋮⋮` 抓手）✓
- 拖动时原字段透明度 0.3，DragOverlay 显示副本 ✓
- 拖动光标到分组框：背景从浅黄变浅蓝 ✓
- 拖动光标到画布底部：EmptyCanvasDropZone 高亮 ✓

- [ ] **Step 10: 持久化验证**

- 走完几个拖拽场景后，保存草稿 → 发布
- 重新加载表单 → 字段顺序、sectionId 与预期一致

- [ ] **Step 11: Commit（如果 E2E 发现了 bug → 修 → 提交）**

```bash
# 如果有 bug 修复
cd /home/cris/dev/safeValidator
git status  # 确认 modified 文件
git add <modified files>
git commit -m "fix(designer): <bug 描述>"
```

---

## Self-Review

**1. Spec 覆盖：**
- §3.1 Droppable 类型 — Task 5/6/7/9 注册 ✓
- §3.2 buildRenderList — Task 1 + Task 10 集成 ✓
- §3.3 库 → 画布 / 画布 → 画布 / 跨组移动 — Task 10 handleDragEnd ✓
- §3.4 Cursor-based 上下判定 — Task 2 工具函数 + Task 11 v1.1 简化为占位（v1.2 再做 inline） ✓（部分）
- §3.5 Store 改动 (addFieldAt, moveField) — Task 3 + Task 4 ✓
- §4 文件改动 — Task 1-11 ✓
- §5 视觉规范（Section 高亮、EmptyDropZone 高亮、DragOverlay 预览）— Task 7/9/10 ✓（inline 插入线 v1.2）
- §6 边界情况 — Task 6 (no-op 同位置) + Task 4 (no-op 不存在 fieldId) + Task 3 (clampedIndex) + Task 10 (onDragCancel) ✓
- §7.1 单元测试 — Task 1/2/3/4 的 test 文件 ✓
- §7.2 E2E 测试 — Task 12 手工验证（Playwright 脚本 v1.2 再写）✓（部分）
- §7.3 视觉回归 — 跳过 ✓

**2. 占位扫描：**
- Task 11 中"v1.2 再做"明确标注，不算占位
- Task 12 手工 E2E 有具体步骤
- 所有代码块都是完整的，不含"TODO"/"fill in"

**3. 类型一致性：**
- `RenderItem` 在 Task 1 定义，Task 10 使用 ✓
- `addFieldAt(type, sectionId, index)` 签名 Task 3 定义，Task 10 使用 ✓
- `moveField(fieldId, targetSectionId, targetIndex)` 签名 Task 4 定义，Task 10 使用 ✓
- `getInsertPosition(overRect, cursorY)` 签名 Task 2 定义 — v1.1 未在 Canvas 调用（v1.2 用） ⚠️ — Task 2 的函数已实现 + 测试，Task 10 简化为落到 'after'，后续 v1.2 改造时再调用 `getInsertPosition`

**4. 潜在问题：**
- `CanvasField` 上 `useSortable` 套在 `Card` 上时，Card 的 `onClick={() => selectField(field.id)}` 与 drag listeners 冲突。dnd-kit PointerSensor 5px 触发阈值会避免点击误判拖动，OK。
- `SubformContainer` 也需要加 `useSortable` 吗？v1 的 `SubformContainer` 渲染 `<CanvasField>` 替换（v1 line 121 看到 SubformContainer 替代了 CanvasField）。如果 SubformContainer 自己不注册 sortable，sortableContext 会丢字段。最简方案：SubformContainer 也注册 `useSortable({ id: 'canvas-field-${field.id}' })`。在 Task 10 中检查并修复。

**关于 SubformContainer 的修复（加入 Task 10 的 Step 1.5）：**

在 Task 10 Step 1 之前，**先**检查 `SubformContainer.tsx`：

```bash
cd /home/cris/dev/safeValidator
grep -n "useSortable\|useDraggable\|useDroppable" frontend/apps/platform-admin/src/features/designer/components/SubformContainer.tsx
```

如果 SubformContainer 没注册 `useSortable`，**需要**：
- 在 SubformContainer 上加 `useSortable({ id: 'canvas-field-${field.id}' })`
- 让 root 字段的 SubformContainer 也参与 SortableContext

在 Task 10 的 Step 1 之后追加 Step 1.5（如果需要）：

```tsx
// SubformContainer.tsx 改动示例
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: `canvas-field-${field.id}`,
  data: { source: 'canvas', fieldId: field.id },
});

return (
  <div ref={setNodeRef} style={{
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }} {...attributes} {...listeners}>
    {/* 原有内容 */}
  </div>
);
```

执行者（agent）必须先检查 SubformContainer 当前状态，如果需要则按上述模式修改。
