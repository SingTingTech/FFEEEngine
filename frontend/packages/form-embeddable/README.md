# @safe-validator/form-embeddable

可嵌入的 React 表单组件库，消费 safeValidator 后端 API。

## 安装

通过 pnpm workspace 消费（推荐）：

```json
// 在消费者的 package.json
{
  "dependencies": {
    "@safe-validator/form-embeddable": "workspace:*",
    "antd": "^5.21.0",
    "@tanstack/react-query": "^5.59.0"
  }
}
```

## 公共 API

- **`<FormFiller formId recordId? readOnly? onSubmitSuccess? onCancel? ...>`** — 表单填写组件
- **`<FormList formId onCreate? onView? onEdit? onDelete? ...>`** — 表单记录列表组件

## 用法

### FormFiller — 填写 / 编辑 / 查看表单

```tsx
import { FormFiller } from '@safe-validator/form-embeddable';

function OrderEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isView = new URLSearchParams(window.location.search).get('mode') === 'view';

  return (
    <FormFiller
      formId={42}
      recordId={id ? Number(id) : undefined}
      apiBase={import.meta.env.VITE_API_BASE}
      token={localStorage.getItem('token')}
      readOnly={isView}
      onSubmitSuccess={(newId) => navigate(`/orders/${newId}`)}
      onCancel={() => navigate('/orders')}
    />
  );
}
```

### FormList — 列表 + 完整 CRUD 触发

```tsx
import { FormList } from '@safe-validator/form-embeddable';

function OrderListPage() {
  const navigate = useNavigate();
  return (
    <FormList
      formId={42}
      apiBase={import.meta.env.VITE_API_BASE}
      token={localStorage.getItem('token')}
      onCreate={() => navigate('/orders/new')}
      onView={(id) => navigate(`/orders/${id}?mode=view`)}
      onEdit={(id) => navigate(`/orders/${id}?mode=edit`)}
      onDelete={async (id) => {
        if (!confirm('确认删除？')) return;
        await fetch(`${API_BASE}/forms/42/records/${id}`, { method: 'DELETE' });
      }}
    />
  );
}
```

## Props 概览

### FormFillerProps

| Prop | 类型 | 说明 |
|---|---|---|
| `formId` | `number` | 必填。要填写的表单 ID |
| `apiBase` | `string` | 必填。后端 API 基础 URL |
| `token` | `string` | 可选。Bearer token |
| `readOnly` | `boolean` | 默认 false。true = 只读展示 |
| `recordId` | `number` | 可选。不传 = 新建模式 |
| `onCreate` / `onEdit` / `onView` / `onDelete` | `() => void` / `(id) => void` | 子表单事件 |
| `onSubmitSuccess` | `(recordId) => void` | 提交成功回调 |
| `onSubmitError` | `(error) => void` | 提交失败回调 |
| `onCancel` | `() => void` | 取消回调（不传则 [取消] 按钮隐藏）|
| `locale` | `'zh_CN' \| 'en_US'` | 默认 'zh_CN' |
| `themeToken` | `Record<string, string>` | AntD 主题 token 覆盖 |

### FormListProps

| Prop | 类型 | 说明 |
|---|---|---|
| `formId` | `number` | 必填 |
| `apiBase` | `string` | 必填 |
| `token` | `string` | 可选 |
| `pageSize` | `number` | 默认 20 |
| `searchableFields` | `string[]` | 可搜索字段 codes |
| `defaultSort` | `{ field, order }` | 默认排序 |
| `columns` | `Array<ColumnDef>` | 自定义列；不传则用 schema 自动生成 |
| `onCreate` / `onView` / `onEdit` / `onDelete` | 同上 | CRUD 触发回调 |
| `title` | `string` | 列表标题；默认用 form.name |
| `locale` | `'zh_CN' \| 'en_US'` | 默认 'zh_CN' |
| `themeToken` | `Record<string, string>` | 主题覆盖 |

## Reference 字段

`type='reference'` 字段渲染为智能 Select：
- trigger 显示 display 文本（消费 `referenceDisplayField` 配置）
- 存储的是 id
- 异步搜索（300ms debounce）+ 滚动加载

## 1:N 嵌套子表单

子表单（通过 form_relationship 配置）**内联展开在父字段下方**：
- 已存在的子记录：显示在列表中，可编辑 / 删除
- [+] 添加：内联追加空项（除非传了 `onCreate`，这时跳消费者路由）
- 链接字段（`childLinkField`）自动处理，用户看不到

## 字段类型

支持的字段类型：text, longtext, number, boolean, date, datetime, select, multiselect, file, reference, subform（subform 由 FormFiller 直接处理）。

后端新增字段类型时，**组件无需改动**（通过 `FieldRenderer` 自动适配）。

## 错误处理

- **字段校验失败**：字段下方显示错误消息，[保存] 不发请求
- **API 4xx**：显示后端返回的 message
- **API 5xx / 网络错误**：通用错误消息

## 测试

```bash
pnpm --filter form-embeddable test --run
```

包含：单元（hooks）、组件（FieldRenderer/ReferenceField）、集成（MSW 模拟后端）。

## 限制

- 文件上传（`type='file'`）暂未实现（仅显示输入框）
- 不本地缓存草稿（网络中断会丢）
- 仅 `zh_CN`（后续可扩展 i18n）
- 不发布到 npm（仅 pnpm workspace 消费）
