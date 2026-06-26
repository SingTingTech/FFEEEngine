# Embeddable Components Design

| 项目 | safeValidator |
|---|---|
| 文档版本 | 1.0 |
| 日期 | 2026-06-26 |
| 范围 | **子项目 4**（4 个子项目中的第 4 个，最后一个）|
| 前置 | [Form Schema Backend](2026-06-26-form-schema-backend-design.md) + [Form Designer](2026-06-26-form-designer-design.md)（均已交付）|
| 后续 | —（本项目是 4 个子项目的最后一步） |

---

## 1. 背景与目标

### 1.1 子项目 4 范围

实现 `packages/form-embeddable/` 这个 npm workspace 包，提供 **3 个可被其他应用嵌入的 React 组件**：

- **`FormFiller`**：交互式表单填写组件（也可 `readOnly` 查看）
- **`FormList`**：表单记录列表 + 完整 CRUD（创建/查看/编辑/删除通过消费者路由跳转）
- **（隐含）**：`ReferenceField`、`NestedChildren`、`FieldRenderer` 等内部组件

**包含**：
- 3 个公开组件的 props 契约
- 10 个字段类型的渲染（含 reference 智能 Select）
- 1:N 嵌套子表单的内联展开渲染
- 提交/校验流程
- reference 字段的异步搜索（debounce）
- 完整 CRUD 流程（创建/查看/编辑/删除由消费者路由跳转）
- pnpm workspace 包结构（无打包步骤，直接消费源码）

**不包含**：
- 表单设计器（sub-project 3）
- 后端 API（sub-project 2）
- 权限管理（明确延后）
- 国际化（除中文外延后）
- npm publish（仅 pnpm workspace 消费）

### 1.2 启动验证清单（子项目 4 完成定义）

- [ ] 平台管理员的"订单"列表页用 `<FormList>` 渲染
- [ ] 列表 [新建] 按钮跳到独立页面（消费者路由配置）
- [ ] 列表 [查看] / [编辑] 跳到独立页面
- [ ] 独立页面用 `<FormFiller>` 渲染
- [ ] reference 字段（客户）可搜索 → 显示 display → 存 ID
- [ ] 1:N 子表单（订单项）内联展开，可添加多行
- [ ] 提交按钮在 FormFiller 底部，点击后校验 + 提交
- [ ] 提交成功后 `onSubmitSuccess(recordId)` 回调
- [ ] readOnly 模式只显示，不允许编辑
- [ ] 单独的应用（非平台管理员）也可 import 这个包使用

---

## 2. 关键决策（来自 brainstorming）

| # | 决策点 | 选择 |
|---|---|---|
| 1 | 1:N 嵌套子表单渲染 | **A. 内联展开**（父字段下面直接展开子列表 + [+] 添加） |
| 2 | FormList 范围 | **C. 完整 CRUD**（列表 + 新建 + 查看 + 编辑 + 删除） |
| 3 | 数据获取 | **A. 内置 fetch**（`apiBase` + `token` props） |
| 4 | FormFiller 提交按钮 | **A. 内嵌**（组件底部 [取消] [保存] 按钮） |
| 5 | Filler/Viewer 关系 | **A. 同一组件**（`readOnly` prop 切换） |
| 6 | reference 字段 UI | **智能 Select**（trigger 显示 display，存 id，异步搜索） |
| 7 | FormList CRUD 位置 | **C. 独立页面**（消费者用 React Router 跳转） |

---

## 3. 路由结构

组件**不强制**使用某种路由方案。消费者用 `react-router-dom`（或 Next.js、Remix 等）配置路由：

```
/orders                     FormList 渲染（消费者页面）
/orders/new                 FormFiller（recordId 不传，新建）
/orders/:id                 FormFiller（recordId 传，加载现有；通过 ?mode=view 控制 readOnly）
/orders/:id/edit            FormFiller（recordId 传，编辑）
```

FormList 的 onCreate/onView/onEdit 回调触发消费者路由跳转。

---

## 4. 架构概览

### 4.1 3 层结构

```
┌─────────────────────────────────────────────────────────────┐
│  公开 API 层 (index.ts)                                      │
│  - FormFiller, FormList                                    │
│  - Type exports: FormFillerProps, FormListProps, ...        │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  组件层 (components/)                                        │
│  - FormFiller    主组件（含校验、提交、嵌套子表单）         │
│  - FormList      列表组件（CRUD 触发回调）                  │
│  - FieldRenderer  按 type 分发到 10 种字段渲染               │
│  - ReferenceField 智能 Select（异步搜索）                   │
│  - NestedChildren 1:N 内联展开                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  数据层 (api/ + hooks/)                                      │
│  - http.ts           fetch 封装（带 token + 错误）          │
│  - endpoints.ts      后端 API 客户端                        │
│  - useFormSchema     加载 schema                            │
│  - useFormData       加载/保存单条记录                      │
│  - useFormList       列表查询                                │
│  - useReferenceLookup reference 搜索                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 文件结构

```
packages/form-embeddable/
├── src/
│   ├── index.ts                       公开 API
│   ├── types.ts                       公开 TS 类型
│   ├── api/
│   │   ├── http.ts                    fetch 封装
│   │   └── endpoints.ts               API 客户端
│   ├── components/
│   │   ├── FormFiller.tsx
│   │   ├── FormList.tsx
│   │   ├── FieldRenderer.tsx
│   │   ├── ReferenceField.tsx
│   │   └── NestedChildren.tsx
│   └── hooks/
│       ├── useFormSchema.ts
│       ├── useFormData.ts
│       ├── useFormList.ts
│       └── useReferenceLookup.ts
├── package.json
├── tsconfig.json
├── vite.config.ts                     构建配置（可选，MVP 不打包）
└── README.md                          用法文档
```

**关键约定**：
- hooks 文件**不导出**（消费者不直接 import）
- 内部 helper 函数模块化
- TS strict + `noUnusedLocals` 强制（与 sub-project 3 一致）

---

## 5. 组件 Props 契约

### 5.1 FormFiller

```typescript
export interface FormFillerProps {
  // 数据源（必填）
  formId: number;
  apiBase: string;
  token?: string;                      // Bearer token; 不传 = 匿名

  // 模式
  readOnly?: boolean;                  // 默认 false; true = 只读展示
  recordId?: number;                  // 不传 = 新建模式

  // 嵌套子表单事件
  onCreate?: () => void;               // 子项 [+ 添加] 按钮（消费者路由跳转）
  onEdit?: (recordId: number) => void;
  onView?: (recordId: number) => void;
  onDelete?: (recordId: number) => void;

  // 提交回调
  onSubmitSuccess?: (recordId: number) => void;
  onSubmitError?: (error: Error) => void;
  onCancel?: () => void;                // [取消] 按钮回调；不传则按钮隐藏

  // 定制
  locale?: 'zh_CN' | 'en_US';           // 默认 zh_CN
  themeToken?: Record<string, string>;   // AntD 主题 token 覆盖
}
```

**按钮渲染规则**：
- 底部固定 [保存] 按钮（readOnly 模式隐藏）
- [取消] 按钮仅当 `onCancel` 传了才显示
- 子项 [+ 添加] 按钮：传了 `onCreate` 就跳消费者路由；不传就内联编辑

### 5.2 FormList

```typescript
export interface FormListProps {
  // 数据源
  formId: number;
  apiBase: string;
  token?: string;

  // 列表配置
  pageSize?: number;                   // 默认 20
  searchableFields?: string[];         // 默认所有 text 字段
  defaultSort?: { field: string; order: 'asc' | 'desc' };

  // 自定义列（可选）
  columns?: Array<{
    title: string;
    dataIndex: string;                // form_field_def.code
    render?: (value: any, record: any) => React.ReactNode;
    width?: number;
  }>;
  // 不传则自动用 sub-project 2 的字段列表 + 操作列

  // CRUD 回调
  onCreate?: () => void;                // [+ 新建] 按钮
  onView?: (recordId: number) => void;  // 行点击 / [查看] 按钮
  onEdit?: (recordId: number) => void;  // [编辑] 按钮
  onDelete?: (recordId: number) => Promise<void> | void;
  // 传了启用对应按钮；不传就隐藏

  // 定制
  title?: string;                      // 默认用 form.name
  locale?: 'zh_CN' | 'en_US';
}
```

### 5.3 公开类型

```typescript
// 类型从 @safe-validator/shared-types 复用
export type { FormFieldDefVO, SchemaDetailVO, FormRecord, PageResult } from '@safe-validator/shared-types';

// 组件特有类型
export interface FormFillerProps { ... }     // 见 §5.1
export interface FormListProps { ... }       // 见 §5.2

// reference 字段专用
export interface ReferenceOption {
  id: number | string;
  display: string;
}

// 1:N 子表单项（内联编辑时）
export interface ChildItem {
  id?: number;                          // 已存在 = 加载的; undefined = 新建
  data: Record<string, any>;
}
```

---

## 6. Reference 字段实现

### 6.1 行为

```
- 未选状态：trigger 显示 "输入搜索..." 占位符
- 用户输入 → debounce 300ms → GET /api/forms/{refFormId}/records/lookup?keyword=...
- 下拉显示 search 结果（最多 20 条）
- 选中 → onChange(id)
- 已选状态：trigger 显示 display 文本（来自已选 record 的 displayField），clearable
- readOnly 模式：直接显示 display 文本，不可交互
```

### 6.2 关键代码（简化）

```typescript
function ReferenceField({ referenceFormId, referenceDisplayField, value, onChange, ... }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebounced] = useDebounce(search, 300);
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // 加载已选中的 display
  useEffect(() => {
    if (value && !displayValue) {
      api.getRecord(referenceFormId, value).then(r => {
        setDisplayValue(r.data[referenceDisplayField]);
      });
    }
  }, [value, referenceFormId, referenceDisplayField, displayValue]);

  // 搜索
  const { data: results } = useQuery({
    queryKey: ['ref-lookup', referenceFormId, debouncedSearch],
    queryFn: () => api.lookupReference(referenceFormId, debouncedSearch, { pageSize: 20 }),
    enabled: open && debouncedSearch.length > 0,
  });

  if (readOnly) return <Input value={displayValue} disabled />;

  return (
    <Select
      showSearch
      value={value ?? undefined}
      placeholder="输入搜索..."
      onSearch={setSearch}
      onDropdownVisibleChange={setOpen}
      onChange={(v) => onChange(v ?? null)}
      filterOption={false}
      options={(results?.records ?? []).map(r => ({ value: r.id, label: r.display }))}
      allowClear
    />
  );
}
```

---

## 7. NestedChildren（1:N 内联展开）

### 7.1 行为

```
- 父表单字段下显示 "📦 子表单名 (1:N)" 标题
- 已存在的子记录：内联显示在列表里（每行可编辑字段 + [×] 删除）
- [+] 添加按钮 → 创建新行（消费者传 onCreate 时跳独立页面；不传时内联追加）
- 子记录字段编辑：内联字段（每个子项是个 mini FormFiller，只是不含提交按钮）
- 父提交时：所有子项作为 children 数组一起 POST（后端事务处理）
```

### 7.2 数据结构

```typescript
const [items, setItems] = useState<ChildItem[]>([]);

// 加载已存在的子记录（仅编辑模式）
useEffect(() => {
  if (recordId) {
    api.listChildren(formId, recordId, childFormId).then(r => {
      setItems(r.data.records.map(rec => ({ id: rec.id, data: rec.data })));
    });
  }
}, [recordId]);

// 提交时构造 children payload
const payload = {
  formId: parentFormId,
  data: parentFormData,
  children: items.map(it => ({
    formId: childFormId,
    data: it.data,
  })),
};
```

### 7.3 验证 + 错误显示

子项的字段错误显示在该子项的 field 旁边。父提交时，如果任一子项校验失败，**父级标红但不阻止**——用户需修复后重新点保存。

---

## 8. FormFiller 提交流程

### 8.1 完整数据流

```
1. FormFiller 挂载（formId 必有，recordId 可选）
2. useFormSchema(formId) → GET /api/forms/{formId}/schema
3. 渲染所有字段（包括 reference 子组件、nested children）
4. 用户填表 → formData state 更新
5. 用户点 [保存]
6. validation 引擎跑所有字段规则
   - 调用各 FieldType.parseValue() 把 raw → typed
   - 跑各 ValidationRule
   - 收集 errors
7. 若 errors 非空 → 显示字段错误，不发请求
8. 若 errors 空 → 构造 payload（包含 children）
9. POST /api/forms/{formId}/records
10. 后端事务：保存父 → 注入 linking → 保存子 → 返回 { recordId, childResults }
11. onSubmitSuccess(recordId) 回调
12. 消费者 navigate('/orders/' + recordId)
```

### 8.2 错误处理

- **校验失败**：字段下方显示错误消息，焦点跳到第一个错误字段
- **API 4xx**：显示后端返回的 `message` 字段（如 "用户不存在"）
- **API 5xx / 网络错误**：通用错误消息 + onSubmitError 回调

---

## 9. FormList 数据流

### 9.1 完整数据流

```
1. FormList 挂载
2. useFormList(formId, query) → GET /api/forms/{formId}/records?pageNum=1&pageSize=20
3. 渲染 Table with pagination
4. [+ 新建] 按钮 → onCreate() 回调（消费者跳独立页面）
5. 行点击 → onView(recordId) 回调
6. 操作列按钮：
   - [查看] → onView(recordId)
   - [编辑] → onEdit(recordId)
   - [删除] → Popconfirm → onDelete(recordId) → 消费者自己调 DELETE → refetch
7. 搜索框 → debounce 300ms → refetch with keyword
8. 翻页 → refetch with new pageNum
```

### 9.2 删除是回调而非内置

理由：
- 删除是"不可逆"操作
- 消费者可能加确认/审计/异步队列
- 组件只关心 UI，反馈通过 refetch 拿到

---

## 10. 与其他子项目的关系

| 依赖 | 来源 |
|---|---|
| `FormFieldDefVO`, `SchemaDetailVO`, `FormRecord`, `PageResult` | `@safe-validator/shared-types`（sub-project 1） |
| 后端 API | sub-project 2（HTTP 端点已就绪） |
| Reference 字段 lookup API | `GET /api/forms/{formId}/records/lookup`（sub-project 2 已有） |
| Schema 定义 | sub-project 2 的 `form_schema` 表 |

**子项目 4 不需要任何后端扩展**。

---

## 11. 实现架构

### 11.1 关键文件清单

| 文件 | 职责 |
|---|---|
| `src/index.ts` | 公开 API（`export { FormFiller, FormList }` + types） |
| `src/types.ts` | 公开 TS 类型 + re-exports |
| `src/api/http.ts` | fetch 封装（带 token + 错误处理） |
| `src/api/endpoints.ts` | 后端 API 客户端（schema, record, list, submit, lookup） |
| `src/components/FormFiller.tsx` | 主组件（含校验、提交、嵌套子表单） |
| `src/components/FormList.tsx` | 列表组件（CRUD 触发回调） |
| `src/components/FieldRenderer.tsx` | 单字段渲染（按 type 分发） |
| `src/components/ReferenceField.tsx` | 智能 Select（异步搜索） |
| `src/components/NestedChildren.tsx` | 1:N 子表单列表（内联展开） |
| `src/hooks/useFormSchema.ts` | 加载 schema |
| `src/hooks/useFormData.ts` | 加载/保存单条记录 |
| `src/hooks/useFormList.ts` | 列表查询 |
| `src/hooks/useReferenceLookup.ts` | reference 搜索 |
| `package.json` | pnpm workspace 包 |
| `vite.config.ts` | 构建配置（可选） |
| `tsconfig.json` | TS 配置（strict + noUnusedLocals） |
| `README.md` | 用法文档 |

### 11.2 包配置

```json
{
  "name": "@safe-validator/form-embeddable",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "antd": "^5.21.0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0"
  }
}
```

**关键点**：
- AntD + React 是 **peerDependencies**（消费者自带）
- TanStack Query 是 **dependencies**（组件内部用）
- 入口指向 `src/index.ts`（pnpm workspace 直接消费源码，MVP 不打包）

### 11.3 TS 配置

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vite/client"]
  },
  "include": ["src/**/*"]
}
```

---

## 12. 测试策略

- **单元测试**（vitest）：hooks（useFormSchema, useFormData, useFormList, useReferenceLookup）
- **组件测试**（@testing-library/react + jsdom）：
  - FieldRenderer 各种 type 渲染
  - ReferenceField 异步搜索行为
  - FormList 表格渲染 + 回调触发
  - FormFiller 校验流
- **集成测试**（MSW mock 后端）：FormFiller 完整提交流程
- **手动 E2E**（sub-project 1 的 platform-admin 中）：通过 FormList/FormFiller 真实测试

---

## 13. 消费者使用示例

```tsx
// 订单列表页
import { FormList } from '@safe-validator/form-embeddable';
import { useNavigate } from 'react-router-dom';

function OrderListPage() {
  const navigate = useNavigate();
  return (
    <FormList
      formId={42}
      apiBase={import.meta.env.VITE_API_BASE}
      token={localStorage.getItem('token')}
      title="订单管理"
      onCreate={() => navigate('/orders/new?formId=42')}
      onView={(id) => navigate(`/orders/${id}?mode=view`)}
      onEdit={(id) => navigate(`/orders/${id}?mode=edit`)}
      onDelete={async (id) => {
        if (!confirm('确认删除？')) return;
        await fetch(`${API_BASE}/api/forms/42/records/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }}
    />
  );
}

// 订单编辑页
import { FormFiller } from '@safe-validator/form-embeddable';

function OrderEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const search = new URLSearchParams(window.location.search);
  const isView = search.get('mode') === 'view';

  return (
    <FormFiller
      formId={42}
      recordId={id ? Number(id) : undefined}
      apiBase={API_BASE}
      token={token}
      readOnly={isView}
      onSubmitSuccess={(newId) => navigate(`/orders/${newId}`)}
      onCancel={() => navigate('/orders')}
    />
  );
}
```

---

## 14. 开放问题

1. **字段类型扩展** —— sub-project 2 的 FieldTypeRegistry 已支持，组件通过 FieldRenderer 自动适配；新增 type 无需改本项目
2. **AntD 主题** —— 通过 `themeToken` prop 覆盖；MVP 不做内置主题切换
3. **文件上传** —— FormFiller 对 `type='file'` 字段暂显示为简单 Input（不上传文件），MVP 不做
4. **离线/草稿** —— FormFiller 不本地缓存；网络中断时丢失
5. **多语言** —— 仅 `zh_CN`（AntD 默认），后续扩展

---

## 15. 决策汇总

| 维度 | 决策 |
|---|---|
| 包管理 | pnpm workspace（无打包步骤） |
| AntD/React | peerDependencies（消费者自带） |
| 数据获取 | 内置 fetch（消费者配 apiBase + token） |
| HTTP 客户端 | 简单 fetch 封装（不依赖 axios） |
| 状态管理 | TanStack Query（server state）+ React useState（UI state） |
| 1:N 子表单 | 内联展开，可加/删/编辑 |
| reference 字段 | 智能 Select + 异步搜索 |
| Filler/Viewer | 同一组件，`readOnly` prop 切换 |
| FormList CRUD | 完整 CRUD + 消费者回调驱动路由跳转 |
| 提交按钮 | FormFiller 底部内嵌 [取消] [保存] |
| 错误显示 | 字段下方显示 + 焦点跳到第一个错误 |
| 删除操作 | 回调（消费者自己 DELETE） |
| 测试 | vitest + @testing-library + MSW |
