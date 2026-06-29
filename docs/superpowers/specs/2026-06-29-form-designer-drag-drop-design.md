# Form Designer 拖拽功能增强 设计

| 项目 | safeValidator |
|---|---|
| 文档版本 | 1.0 |
| 日期 | 2026-06-29 |
| 范围 | 表单设计器画布（子项目 3 的拖拽 UX 增强）|
| 前置 | [Form Designer UI](2026-06-26-form-designer-design.md)（v1 已交付，当前版本的修复 + 增强）|
| 状态 | 草案 → 待用户 review |

---

## 1. 背景与目标

### 1.1 当前状况（v1 的痛点）

画布拖拽仅支持"画布内字段重排"，缺失以下能力：

1. **库 → 画布的拖拽根本无效**：`ComponentCard` 设了 `cursor: 'grab'` 但**没有注册 `useDraggable`**，光标看着像可拖，实际上拖不动。用户只能点击 [+] 按钮添加。
2. **字段不能跨分组移动**：把根字段拖到分组里、把组内字段拖到根、组 A 的字段拖到组 B——**全部不工作**。`CanvasSection` 虽注册了 `useDroppable`，但 `Canvas.handleDragEnd` 的画布分支只能重排 `fields[]` 数组，不知道怎么改 `sectionId`。
3. **从库不能直接拖到分组**：库 → 画布的 `addField` 走的是根级插入，不会落到分组内。
4. **没有插入位置反馈**：拖到字段上时没有插入线、拖到分组时没有高亮、拖到画布空白处完全没反应（`over=null` 直接 return）。
5. **字段卡片必须拖 `⋮⋮` 抓手才能拖**：整张卡不可拖，UX 不直观。
6. **SortableContext 没真正起作用**：`CanvasField` 用的是 `useDraggable + useDroppable`，不是 `useSortable`——所以 `SortableContext` 包裹实际上不生效（只能重排，不能 animate 位移）。

### 1.2 目标

把画布的拖拽 UX 提升到主流表单设计器水平：

- **A. 分组进出**：字段能拖进 / 拖出分组，跨组时自动改 `sectionId`
- **B. 插入位置反馈**：拖到字段之间显示插入线，拖到分组 / 画布空白时高亮目标
- **C. 库 → 分组**：从组件库直接拖到指定分组
- **D. 库 → 画布** 真正可用（修 bug）：注册 `useDraggable` 让库卡片可拖

加上"整卡可拖"和"画布空白高亮"两个细节。

### 1.3 不在范围

- 不引入新的拖拽库（沿用 `@dnd-kit/core` + `@dnd-kit/sortable`）
- 不改后端（`FormSchemaService.publishNewVersion` 已支持 `sectionId + sortOrder` 重映射）
- 不改字段的存储模型（仍是平面 `fields[] + sectionId`）
- 不做 section 之间的整体重排（v1 没要求，v1.1 也不做）
- 不做嵌套分组（section 不能再嵌 section）

---

## 2. 关键决策汇总（来自 brainstorming）

| # | 决策点 | 选择 |
|---|---|---|
| 1 | 范围 | A + B + C + D 全部（修库拖拽 bug + 分组进出 + 插入反馈 + 库 → 分组）|
| 2 | 视觉反馈 | 插入线 + 目标高亮（两者都有）|
| 3 | 插入位置 | cursor-based：上半部 = 上方，下半部 = 下方（`closestCorners` 碰撞检测）|
| 4 | 拖到分组框本身 | 加到该分组末尾（不论该分组在画布上是否连续）|
| 5 | 拖到画布空白 | 高亮画布底部 + 加到根字段末尾 |
| 6 | 拖拽触发方式 | 整张卡片可拖（去除 `⋮⋮` 抓手）|
| 7 | 显示顺序 | **数组顺序 = 显示顺序**——分组不一定连续，可分散在画布上 |
| 8 | 拖动预览 | 保留 `DragOverlay`（光标跟半透明副本，原位置变虚）|
| 9 | 子表单字段 | 走和普通字段一样的拖拽路径 |

---

## 3. 架构

### 3.1 Droppable 类型

`Canvas` 内的所有可放置目标：

| Droppable id 模式 | 注册方式 | 触发行为 |
|---|---|---|
| `canvas-field-${fieldId}` | 字段卡片的 `useSortable` | 在该字段的上方 / 下方插入（cursor 位置）|
| `canvas-section-${sectionId}` | 分组容器的 `useDroppable` | 加到该分组的末尾（在数组中最后一个该分组的字段之后）|
| `canvas-empty` | 画布底部区域的 `useDroppable` | 加到根字段末尾 |

库拖拽源：

| Draggable id 模式 | 注册方式 | 来源 |
|---|---|---|
| `library-${type}` | `ComponentCard` 的 `useDraggable` | 组件库（左栏）|

### 3.2 渲染流程

```
fields[] + sections[]
  ↓
buildRenderList()  ← 把数组顺序的连续同组字段聚合成"section 项"
  ↓
RenderItem[]  (alternating 'field' / 'section')
  ↓
<CanvasSection> for sections
<CanvasField> for root fields
<SubformContainer> for subform type
```

`buildRenderList` 的逻辑（伪代码）：

```typescript
function buildRenderList(fields, sections): RenderItem[] {
  const result: RenderItem[] = [];
  const sectionById = new Map(sections.map(s => [s.id, s]));
  let currentSectionId: string | null = null;
  let currentRun: FormFieldDefVO[] = [];

  const flush = () => {
    if (currentSectionId === null) {
      for (const f of currentRun) result.push({ kind: 'field', field: f });
    } else {
      const section = sectionById.get(currentSectionId);
      if (section) {
        result.push({ kind: 'section', section, fields: currentRun });
      } else {
        // section not found (deleted), treat as root
        for (const f of currentRun) result.push({ kind: 'field', field: f });
      }
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

**分散分组的视觉表现**：如果分组的字段在数组中不连续（例如 `[A, B1, B2, X, B3, C]`，X 是根字段夹在 B 之间），该分组会在画布上"出现两次"——两次黄色虚线框。这是可接受的边界情况，用户可以通过拖动重排修正。

### 3.3 拖拽 → 数据更新流程

#### 库 → 画布

```
1. 用户在 ComponentCard 上 mousedown + drag
2. dnd-kit 触发 handleDragStart，setDraggingType(type)
3. DragOverlay 显示 "+ ${type}" 浮动副本
4. 用户拖到目标（字段 / 分组 / 空白），over.rect 给出目标位置
5. 用户松开 → handleDragEnd
6. 根据 over.id 类型：
   a. 'library-X' + 'canvas-field-Y' → cursor 在 Y 的上半 / 下半 → addFieldAt(X, Y.sectionId, before/after)
   b. 'library-X' + 'canvas-section-Y' → addFieldAt(X, Y, afterLastFieldOfY)
   c. 'library-X' + 'canvas-empty' → addFieldAt(X, null, at root end)
7. store 更新 fields[]，触发重渲染
8. 新字段高亮选中（沿用 v1 的 selectedFieldId 行为）
```

#### 画布 → 画布

```
1. 用户在字段卡片上 mousedown + drag
2. dnd-kit 触发 handleDragStart
3. DragOverlay 显示该字段的浮动副本，原位置变虚
4. 用户拖到目标，over.rect 给出位置
5. 用户松开 → handleDragEnd
6. 根据 over.id 类型：
   a. 'canvas-field-A' + 'canvas-field-B' → cursor 在 B 的位置 → moveField(A, B.sectionId, before/after B)
   b. 'canvas-field-A' + 'canvas-section-B' → moveField(A, B, afterLastFieldOfB)
   c. 'canvas-field-A' + 'canvas-empty' → moveField(A, null, at root end)
7. store 更新 fields[]（重排 + 必要时改 sectionId）
8. dnd-kit 的 useSortable 自动 animate 位移
```

#### 跨组移动

字段从 A 组拖到 B 组：
- `targetSectionId` 从 A 变 B
- 字段在数组中的新位置 = B 组最后一个字段之后
- `sectionId` 字段值更新

### 3.4 Cursor-based 上下判定

`dnd-kit` 的 `closestCorners` 碰撞检测能给出鼠标当前在哪个 droppable 上。判定"上方 / 下方"的算法：

```typescript
function getInsertPosition(over, cursorY): 'before' | 'after' {
  // over.rect 是目标 droppable 的 bounding rect
  const midY = over.rect.top + over.rect.height / 2;
  return cursorY < midY ? 'before' : 'after';
}
```

dnd-kit 在 `onDragOver` 事件中提供 `over.rect` 和 `event.activatorEvent`（含初始位置）+ 后续 `delta`（位移）。`cursorY = activatorEvent.clientY + delta.y`。

为了避免每个 droppable 自己计算，统一放在 `getInsertPosition(activeId, overId, overRect, cursorY)` 工具函数里。

### 3.5 Store 改动

`designerStore.ts` 新增两个 action：

```typescript
addFieldAt(type: string, sectionId: string | null, index: number): FormFieldDefVO
moveField(fieldId: string, targetSectionId: string | null, targetIndex: number): void
```

`addFieldAt`：在 `fields[]` 数组的 `index` 位置插入新字段，设 `sectionId`。`sectionId=null` 表示加到根字段（按数组顺序的根字段段）。

`moveField`：从 `fields[]` 移除 `fieldId` 字段，在新 `targetIndex` 位置插入，更新 `sectionId`。`sectionId` 与新位置一致时为同组重排，不一致时为跨组移动。

保留 `addField(type, atIndex?)`（兼容属性面板等场景）和 `setFieldSection(fieldId, sectionId)`（属性面板的"所属分组"下拉）。

---

## 4. 文件改动清单

### 4.1 修改

| 文件 | 改动 |
|---|---|
| `ComponentCard.tsx` | 加 `useDraggable({ id: 'library-${type}', data: { source: 'library', type } })` |
| `CanvasField.tsx` | `useDraggable + useDroppable` → `useSortable({ id: 'canvas-field-${fieldId}' })`；去除 `⋮⋮` 抓手 span；监听器移到 Card 整体 |
| `CanvasSection.tsx` | 保留 `useDroppable({ id: 'canvas-section-${sectionId}' })`；加 `isOver` 高亮（背景从 `#fffbe6` → `#e6f4ff`）|
| `Canvas.tsx` | `closestCorners` collision detection；`onDragOver` 跟踪 over.rect / cursorY；改 `handleDragEnd` 支持 section/empty；新增 `<InsertionLine>` / `<EmptyCanvasDropZone>`；用 `buildRenderList` 渲染 |
| `dndHelpers.ts` | 新增 `getInsertPosition(activeId, overId, overRect, cursorY)` 返回 `{ sectionId, index, position }` |
| `designerStore.ts` | 新增 `addFieldAt`、`moveField` |
| `designerStore.test.ts` | 新增上述两个 action 的单元测试 |
| `dndHelpers.test.ts` | 新增 `getInsertPosition` 的单元测试 |

### 4.2 新增

| 文件 | 职责 |
|---|---|
| `InsertionLine.tsx` | 渲染 2px 蓝色横线（`#1677ff`），接收 `{ sectionId, index }` props，在 Canvas 内按位置渲染 |
| `EmptyCanvasDropZone.tsx` | 画布底部 drop 区，30px 高度；`isOver` 时高亮（背景 `#e6f4ff` + 顶部 1px 蓝线）|
| `buildRenderList.ts` | 把 `fields[] + sections[]` 转换为 `RenderItem[]` 的纯函数；可独立单测 |

### 4.3 后端

**无改动**。`FormSchemaService.publishNewVersion`（`safe-validator-form` 模块）已经支持：
- `CreateSectionRequest.id` 字段（用于 clientId → serverId 重映射）
- `CreateFieldRequest.sectionId` 字段（接受 String 类型，前端发 clientId 或 serverId）
- `sortOrder` 字段（前端按数组顺序生成）

---

## 5. 视觉规范

### 5.1 插入线

- 颜色：`#1677ff`（AntD 主题蓝）
- 高度：2px
- 圆角：1px
- 左右内边距：与字段卡片的水平 padding 一致
- 出现位置：目标字段的上方 / 下方（根据 cursor）
- 出现于分组末尾时：紧贴分组最后字段下方
- 出现于根字段末尾时：紧贴最后一个根字段下方

实现：在 Canvas 内用绝对定位的 `<div>`，根据 `over` state 计算 `top`。

### 5.2 分组高亮

- 默认背景：`#fffbe6`（浅黄）
- isOver 背景：`#e6f4ff`（浅蓝）
- 边框：2px dashed `#faad14`（橙色）
- isOver 边框：`#1677ff`（蓝色）
- 过渡：`transition: all 0.15s`

### 5.3 画布空白高亮

- `<EmptyCanvasDropZone>` 默认透明
- isOver 时背景 `#f0f8ff` + 顶部 1px 蓝线
- 文案可选："拖到此处加到末尾"（淡灰）

### 5.4 拖动时字段预览

- `<DragOverlay>` 显示原字段卡片的副本
- 透明度 0.9
- 阴影加深（`box-shadow: 0 4px 12px rgba(0,0,0,0.15)`）
- 跟随光标

原位置：opacity 0.3（由 `useSortable` 的 `isDragging` 控制）

---

## 6. 边界情况

| 场景 | 行为 |
|---|---|
| 拖到自己的位置 | no-op |
| 拖到同组同位置 | no-op |
| 拖到不存在的 section | 视为 root 字段（sectionId=null）|
| 拖到已删除的字段 | no-op（over=null）|
| 拖到组件库自己 | 阻止（`useDroppable` 不在 library 内）|
| 跨组移动时分组被删 | store 报错，记录在控制台；UI 显示错误提示 |
| 字段列表为空时拖库 | 字段直接加到 `fields[0]`，`sectionId=null` |
| 多个拖拽源同时激活 | dnd-kit 互斥，同一时间只一个 |
| 移动端触摸 | 沿用 PointerSensor 5px 触发阈值 |

---

## 7. 测试

### 7.1 单元测试

- `buildRenderList`：
  - 空数组 → 空结果
  - 全根字段 → 全 'field' 项
  - 单个分组连续 → 一个 'section' 项
  - 单个分组分散 → 多个 'section' 项
  - 多分组交错 → 顺序正确
  - 引用不存在的 sectionId → 视为 root

- `dndHelpers.getInsertPosition`：
  - cursor 在 over 上半 → 'before'
  - cursor 在 over 下半 → 'after'
  - cursor 在 over 中线 → 边界条件（选 'before' 或 'after'，保持一致）

- `designerStore`：
  - `addFieldAt`：插入到正确位置，正确设 `sectionId`
  - `moveField`：同组重排、跨组移动、改 `sectionId`、移到根

### 7.2 E2E 测试（Playwright）

覆盖以下拖拽场景：

1. **库 → 画布空白**：拖"文本"到空画布底部 → 1 个文本字段在根末尾
2. **库 → 字段**：拖"数字"到字段 A 的下半部 → 数字在 A 之后
3. **库 → 分组**：拖"日期"到分组框 → 日期加到分组末尾
4. **画布内重排**：拖字段 A 到字段 B 的上半部 → A 在 B 之前
5. **跨组移动**：字段 A 在分组 1，拖到分组 2 → A 出现在分组 2 末尾，sectionId 改变
6. **移出分组**：字段 A 在分组 1，拖到根字段 → A 出现在根，sectionId=null
7. **拖到画布空白**：拖字段 A 到画布底部 → A 移到根字段末尾

每个场景验证：DOM 顺序、`sectionId` 值、store 状态、后端持久化（发布后 GET 返回一致数据）。

### 7.3 视觉回归

不需要（v1 没视觉测试基线；手工验证即可）。

---

## 8. 实施步骤（高层）

1. **底层工具**：`dndHelpers.getInsertPosition` + 单元测试
2. **渲染聚合**：`buildRenderList` 纯函数 + 单元测试
3. **store actions**：`addFieldAt`、`moveField` + 单元测试
4. **组件级 dnd 改造**：
   - `ComponentCard` 加 `useDraggable`
   - `CanvasField` 切到 `useSortable`、去抓手
5. **Droppable + 视觉**：
   - `CanvasSection` 高亮
   - `<EmptyCanvasDropZone>` + 高亮
   - `<InsertionLine>` 渲染
6. **`Canvas.tsx` 整合**：collision detection、onDragOver tracking、handleDragEnd 扩展
7. **E2E 测试**：Playwright 脚本覆盖 7 个场景
8. **手工验证**：刷新浏览器，走一遍真实拖拽

---

## 9. 风险与权衡

- **SortableContext 行为变化**：从 v1 的"看起来用了但实际没起作用"变成"真用 SortableContext"，可能会有未预料的动画/位移行为。准备好在 dnd-kit 配置上调整（`strategy: verticalListSortingStrategy` + `animateLayoutChanges`）。
- **分散分组的多重渲染**：用户可能对此感到困惑（同一个分组标签出现两次）。通过 tooltip / 提示让用户知道这是数组顺序的直接结果。后续可加"自动合并同组连续字段"的辅助按钮。
- **`closestCorners` 精度**：`closestCorners` 在字段密集时可能误判。先用 `closestCorners`，再视情况切 `rectIntersection`。
- **库拖拽的体感**：从左侧拖到画布需要跨越大段距离，体感可能不如"点击 +"流畅。但这是用户的明确要求，保留。

---

## 10. 后续可做（不在本次范围）

- 分组自身的拖拽重排（section 整体上下移动）
- 嵌套分组（section 内嵌 section）
- 字段多选拖拽（按住 Shift / Cmd 多选后一起拖）
- 拖拽时的撤销 / 重做（基于 isDirty 历史的栈）
- 视觉回归测试（Percy / Chromatic）
