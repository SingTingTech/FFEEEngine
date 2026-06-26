# Form Designer UI Design

| 项目 | safeValidator |
|---|---|
| 文档版本 | 1.0 |
| 日期 | 2026-06-26 |
| 范围 | **子项目 3**（4 个子项目中的第 3 个）|
| 前置 | [Form Schema Backend Engine](2026-06-26-form-schema-backend-design.md)（已交付）|
| 后续 | 子项目 4 — 嵌入组件库 |

---

## 1. 背景与目标

### 1.1 子项目 3 范围

构建**表单设计器**——一个让管理员通过拖拽 / 点击配置表单 schema 的 Web UI。它消费 sub-project 2 已交付的 HTTP API（form CRUD、字段定义、关系配置、DB introspection），但本身**只做编辑态**，不实现表单运行时（运行时属于子项目 4）。

**包含**：
- 表单列表页（创建、搜索、编辑入口）
- 三栏设计器主页面（组件库 / 画布 / 属性面板）
- 字段、子表单、分组三类组件的编辑
- 父子关系配置（**多对链接字段**、业务主键优先）
- 草稿 + 发布工作流
- 实时预览（只读模式，使用 sub-project 4 复用组件）
- type-aware 字段映射（普通字段 → target_column；reference → 目标表单）

**不包含**：
- 表单运行时（子项目 4）
- 权限管理（明确延后）
- 字段类型 / 校验规则的扩展机制（sub-project 2 已实现注册表）
- 文件上传实现（仅 UI 框）

### 1.2 启动验证清单（子项目 3 完成定义）

- [ ] 顶级菜单"📋 表单设计器"可见
- [ ] 表单列表页：可搜索、可创建、可点编辑、可删除
- [ ] 设计器三栏：组件库 / 画布 / 属性面板
- [ ] 组件库 5 个分类（文本/数字/日期/选择/容器/其他）+ 容器类含分组 + 子表单
- [ ] 双模式添加：点击 [+] 追加 / 拖拽插入 / 拖拽重排
- [ ] 画布分组容器（Section）：仅显示分组，不影响字段数据
- [ ] 画布子表单容器：显示子表单字段只读预览 + 🔒 标记
- [ ] 属性面板类型感知：普通字段显示 target_column，reference 字段显示目标表单
- [ ] 父子关系配置：多对链接字段 + 父表单业务主键优先 + on_delete
- [ ] 草稿 / 发布：编辑后保存草稿；点"发布"才创建新 schema 版本
- [ ] 预览侧边抽屉：只读渲染当前 schema 的填写界面
- [ ] target_table 创建后不可修改

---

## 2. 关键决策汇总（来自 brainstorming）

| # | 决策点 | 选择 |
|---|---|---|
| 1 | 整体布局 | 三栏式（左组件库 / 中画布 / 右属性面板）|
| 2 | 组件库分组 | 按功能分类（5 组）+ 容器类含分组 + 子表单 |
| 3 | 添加字段交互 | 双模式（点击 [+] 追加 / 拖拽插入 / 拖拽重排）|
| 4 | 画布布局 | 扁平 + 分组（Section）|
| 5 | 分组是否影响字段数据 | **否**——分组是独立组件，仅影响显示 |
| 6 | 子表单设计 | 独立实体；父表单画布上的子表单容器只读预览 |
| 7 | 父子关系配置位置 | **父表单侧**——点开子表单容器弹窗配置 |
| 8 | 链接字段数量 | 多个（数组），父表单业务主键优先 |
| 9 | 字段映射 UI | 属性面板内联 + 类型感知（reference 字段有专门配置）|
| 10 | target_table 配置 | 创建时设定，**创建后不可修改** |
| 11 | 保存 / 发布工作流 | 草稿 + 发布（与 sub-project 2 immutable 版本契合）|
| 12 | 设计器入口 | 顶级菜单"📋 表单设计器" |

---

## 3. 路由结构

```
/designer                          FormListPage（列表 + 创建）
/designer/new                      FormListPage 内的"创建表单"Modal
/designer/:formId                  DesignerPage（三栏主页面）
/designer/:formId/preview          PreviewDrawer 路由（实际为 Modal/Drawer）
```

---

## 4. 架构概览

### 4.1 3 层组件树

```
┌─────────────────────────────────────────────────────────────┐
│  页面层                                                     │
│  - FormListPage          列表 + 创建                        │
│  - DesignerPage          设计器主页面                       │
│  - PreviewDrawer         预览（Drawer/Mode="preview"）      │
└──────────────────┬─────────────────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────────────────┐
│  功能组件层 (features/designer)                             │
│                                                             │
│  TopBar                顶部操作栏                            │
│  ComponentLibrary      左栏组件库                           │
│  Canvas                中央画布（拖拽）                      │
│    - CanvasField        普通字段                            │
│    - CanvasSection      分组容器                            │
│    - SubformContainer   子表单容器（含子表单字段预览）       │
│  PropertyPanel         右栏属性面板（类型感知）              │
│  SubformConfigDrawer   子表单配置抽屉                       │
│  LinkFieldsEditor      链接字段对编辑器                    │
│  FieldTypeRenderer     字段类型图标（按 type 显示）         │
│  ValidationEditor      校验规则编辑                         │
│  SectionListManager    分组管理（创建/重命名/删除分组）     │
└──────────────────┬─────────────────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────────────────┐
│  服务层 (services/designer)                                 │
│                                                             │
│  designerApi           fetch 封装（sub-project 2 API 客户端）│
│  designerStore         Zustand store（draft 编辑状态）     │
│  useSchema             加载/发布 schema 的 hook              │
│  useFieldTypes         字段类型枚举（来自后端）              │
│  useTables             DB introspection hook                │
│  useBusinessKeys       父表单业务主键加载 hook              │
│  dndHelpers            拖拽工具（dnd-kit）                  │
│  schemaDiff            草稿 vs 发布版本的 diff 计算          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 状态管理分工

| 状态类型 | 工具 | 例子 |
|---|---|---|
| **服务端数据**（server state）| TanStack Query | schema、字段列表、关系列表、字段类型枚举、用户表 |
| **客户端草稿**（client draft）| Zustand store | 用户当前编辑中的 fields、sections、subform configs、target_table |
| **本地 UI 状态**（UI ephemeral）| useState | 当前选中字段、Modal 开关、tab 切换 |

**重要**：草稿状态在用户编辑时实时变化，但**不自动保存**——需要点"💾 保存草稿"。发"📤 发布"时，把当前 draft 打包成 `UpdateSchemaRequest` POST 到 `/api/forms/:formId/schema`，引擎返回新版本号。

---

## 5. FormListPage

### 5.1 布局

```
<PageHeader title="📋 表单设计器" extra={<NewFormButton />} />
<FormListTable
  search
  columns={[名称, 最新版本, 状态, 字段数, 更新时间, 操作]}
/>
```

### 5.2 表格列

- **名称**（可搜索）
- **最新版本**（如 v3）
- **状态** Tag（草稿 / 已发布 / 已归档）
- **字段数**（数字）
- **target_table**（如果有）
- **更新时间**（相对时间）
- **操作**：编辑 / 删除（带确认 Modal）

### 5.3 创建表单

点击"+ 新建表单"打开 Modal：

```
┌──────────────────────────────┐
│ 新建表单                      │
│                              │
│ 名称 *：[_________________] │
│ 编码 *：[_________________] │
│ 描述 ：[___________________]│
│                              │
│ target_table *：              │
│ ( ) 不映射（用 form_data）    │
│ (•) 映射到表：orders ▾       │
│                              │
│ [取消]            [创建]      │
└──────────────────────────────┘
```

- target_table 下拉数据源：`GET /api/admin/db/tables`
- 选"不映射"→ 字段无需 target_column；选具体表 → 字段必须配 target_column
- 提交：`POST /api/forms` → 跳转到 `/designer/:newFormId`

---

## 6. DesignerPage 三栏主页面

### 6.1 总体结构

```
<DesignerPage>
  <TopBar />                  # 顶部固定栏

  <Layout style={{ height: 'calc(100vh - 64px)' }}>
    <Sider width={260}>
      <ComponentLibrary />     # 左栏：组件库
    </Sider>

    <Content>
      <Canvas />                # 中央：画布
    </Content>

    <Sider width={340}>
      <PropertyPanel />         # 右栏：属性面板
    </Sider>
  </Layout>

  <PreviewDrawer />           # 全局：预览侧边抽屉
  <SubformConfigDrawer />     # 全局：子表单配置抽屉
</DesignerPage>
```

### 6.2 TopBar 顶部

```
<header>
  <Button icon={<ArrowLeft />}> 返回</Button>

  <Title>📋 订单</Title>
  <Tag>v3 草稿</Tag>
  <Tag>映射到表: orders</Tag>   {/* 创建后只读 */}

  <Spacer />

  <Button icon={<Eye />}> 预览</Button>
  <Button icon={<Save />}> 保存草稿</Button>
  <Button type="primary" icon={<Rocket />}> 发布新版本</Button>
</header>
```

**关键行为**：
- 表单名、target_table、版本号均只读（创建后冻结）
- "保存草稿"：PATCH `/api/forms/:formId/schema`（草稿状态在数据库，is_current=false）
- "发布新版本"：再次调用 PATCH，但会触发引擎创建新 schema_id，version+1，旧版本 immutable
- "预览"打开 PreviewDrawer（只读渲染）

### 6.3 ComponentLibrary（左栏 260px）

```
<Tabs items={['字段', '子表单']} />

{/* "字段" tab */}
<Search placeholder="搜索字段类型" />
<Collapse accordion>
  <Panel header="📝 文本类">
    <ComponentCard type="text" label="文本" draggable />
    <ComponentCard type="longtext" label="长文本" draggable />
  </Panel>
  <Panel header="🔢 数字类">
    <ComponentCard type="number" label="数字" draggable />
  </Panel>
  <Panel header="📅 日期类">
    <ComponentCard type="date" label="日期" draggable />
    <ComponentCard type="datetime" label="日期时间" draggable />
  </Panel>
  <Panel header="☑️ 选择类">
    <ComponentCard type="select" label="单选" draggable />
    <ComponentCard type="multiselect" label="多选" draggable />
  </Panel>
  <Panel header="🧩 容器类">
    <ComponentCard type="section" label="分组" draggable />
    <ComponentCard type="subform" label="子表单" draggable />
  </Panel>
  <Panel header="📎 其他">
    <ComponentCard type="boolean" label="布尔" />
    <ComponentCard type="file" label="文件" />
    <ComponentCard type="reference" label="引用" />
  </Panel>
</Collapse>

{/* "子表单" tab */}
<SubformList>
  - 列出所有可作为子表单的 form（当前 form 之外）
  - 每个可拖入画布作为子表单容器
</SubformList>
```

**ComponentCard 组件**：

```
<Card hoverable draggable onClick={onAdd}>
  <FieldTypeIcon type={type} />
  <span>{label}</span>
  <Button type="text" icon={<PlusOutlined />} onClick={onAdd} />
</Card>
```

- `draggable`：支持 dnd-kit 拖入画布
- `+` 按钮：点击追加到画布末尾
- 字段类型图标来自后端 `GET /api/admin/...` 或前端常量映射

### 6.4 Canvas 中央画布

```
<Canvas>
  {fields.length === 0 && <EmptyState>从左侧组件库拖入或点击 [+]</EmptyState>}

  <DndContext onDragEnd={handleReorder}>
    <SortableList items={renderableFields} onReorder={reorderFields}>
      {(field) => <CanvasItem field={field} onClick={selectField} />}
    </SortableList>
  </DndContext>
</Canvas>
```

**3 种字段渲染**：

```
renderableFields: [
  // Section: 渲染分组容器，里面装属于此分组的 fields
  { kind: 'section', section, children: fields.filter(f => f.sectionId === section.id) },
  // Subform: 渲染子表单容器
  { kind: 'subform', field: subformField },
  // 普通字段
  { kind: 'field', field: regularField },
]
```

**CanvasField**（普通字段卡片）：

```
<Card hoverable selected={selected} onClick={() => onSelect(field)}>
  <DragHandle />
  <FieldTypeIcon type={field.type} />
  <span>{field.name || field.code}</span>
  <Tag color="default">{field.type}</Tag>
  {field.required && <Tag color="red">必填</Tag>}
  {field.isLinkField && <Tag color="purple">链接字段</Tag>}

  <Dropdown menu={actionsMenu}>⋮</Dropdown>
</Card>
```

**CanvasSection**（分组容器）：

```
<div dashed border style="background: #fffbe6">
  <header onClick={selectSection}>
    <DragHandle />
    <span>▾</span>
    <span>{section.name}</span>
    <Tag>分组</Tag>
    <Dropdown menu={sectionMenu}>⋮</Dropdown>
  </header>
  <div style="padding-left: 24px">
    {children.map(f => <CanvasField key={f.id} field={f} />)}
  </div>
</div>
```

**SubformContainer**（子表单容器）：

```
<div dashed border style="background: #e6f7ff" onClick={openSubformConfig}>
  <header>
    <span>📦</span>
    <span><b>{subformName}</b></span>
    <Tag color="blue">子表单</Tag>
    <Tag>{isList ? '1:N' : '1:1'}</Tag>
    <small style="color: #888">🔒 只读预览</small>
    <Button size="small">⚙ 配置</Button>
    <Button size="small">↗ 打开子表单</Button>
  </header>

  {/* 只读预览子表单字段（不显示链接字段） */}
  <div style="padding: 8px; background: white">
    {childFields.filter(f => !f.isLinkField).map(f => (
      <div key={f.id}>• {f.name} ({f.type}) {f.required && '必填'}</div>
    ))}
  </div>
</div>
```

### 6.5 PropertyPanel 右栏（类型感知）

**A. 普通字段被选中**：

```
<PropertyPanel field={selectedField}>
  <Form layout="vertical">
    <Form.Item label="code"><Input value={field.code} disabled /></Form.Item>
    <Form.Item label="显示名"><Input value={field.name} /></Form.Item>
    <Form.Item label="类型">
      <Select value={field.type} options={fieldTypes} disabled={hasData} />
    </Form.Item>
    <Form.Item label="必填"><Switch /></Form.Item>

    {/* target_table 已选时显示映射 */}
    {form.targetTable && (
      <Form.Item label="目标列" required>
        <Select
          placeholder="选择列"
          options={tableColumns.map(c => ({
            value: c.name, label: `${c.name} (${c.typeName})`
          }))}
          showSearch
        />
      </Form.Item>
    )}

    <ValidationEditor field={field} />
  </Form>
</PropertyPanel>
```

**B. reference 字段被选中**——"目标列"区域替换为：

```
<Form.Item label="🔗 引用配置">
  <Form.Item label="目标表单">
    <Select options={otherForms.map(...)} />
  </Form.Item>
  <Form.Item label="显示字段">
    <Select options={targetFormFields.map(...)} />
  </Form.Item>
  <Form.Item label="存储为">
    <Select options={[{value:'bigint',label:'BIGINT (FK)'}, {value:'varchar',label:'VARCHAR'}]} />
  </Form.Item>
</Form.Item>
```

**C. subform 容器被选中**——弹出 SubformConfigDrawer（不在右栏内，而是全局 Drawer）

**D. section 容器被选中**：

```
<PropertyPanel section={selectedSection}>
  <Form layout="vertical">
    <Form.Item label="分组名"><Input /></Form.Item>
    <Form.Item label="说明文字（可选）"><Input /></Form.Item>
  </Form>
</PropertyPanel>
```

**ValidationEditor** 子组件（所有普通字段都显示）：

```
<Collapse>
  <Panel header="校验规则">
    <Button onClick={openValidationModal}>编辑校验</Button>
    <small>已配置: 必填, min=2</small>
  </Panel>
</Collapse>
```

点"编辑校验"打开 ValidationEditorModal，按 field.type 显示对应的规则输入：

- `text`：required / minLength / maxLength / pattern
- `number`：required / min / max / integer
- `date`/`datetime`：required / minDate / maxDate
- `select`：required / inOptions
- `multiselect`：required / minItems / maxItems
- `reference`：required / referenceExists

---

## 7. SubformConfigDrawer

点击子表单容器或"⚙ 配置"按钮打开：

```
<Drawer title="子表单配置" width={720} open={open}>
  <Form layout="vertical">
    <Form.Item label="引用表单" required>
      <Select options={otherForms} onChange={loadChildFields} />
    </Form.Item>

    <Form.Item label="是否为列表（1:N）" valuePropName="checked">
      <Switch />
    </Form.Item>

    <Form.Item label="on_delete">
      <Select options={['CASCADE','SET_NULL','RESTRICT']} />
    </Form.Item>

    <Divider />

    <b>🔗 链接字段映射</b>
    <small>父表单字段 ↔ 子表单字段。多对，提交时引擎自动注入。</small>

    <LinkFieldsEditor
      parentFields={parentFields}
      childFields={childFields}
      parentBusinessKeys={businessKeys}
      value={linkFields}
      onChange={setLinkFields}
    />

    <Button onClick={addLinkFieldPair}>+ 添加链接字段对</Button>
  </Form>
</Drawer>
```

**LinkFieldsEditor** 子组件：

```
<table>
  <thead>
    <tr>
      <th>父表单字段</th>
      <th>↔</th>
      <th>子表单字段</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {value.map((pair, i) => (
      <tr>
        <td>
          <Select
            options={[
              ...parentBusinessKeys.map(f => ({value: f.code, label: `${f.code} (${f.type}) ⭐ 业务主键`})),
              ...otherParentFields.map(f => ({value: f.code, label: `${f.code} (${f.type})`}))
            ]}
          />
        </td>
        <td>↔</td>
        <td>
          <Select
            options={childFields
              .filter(f => f.isLinkField || i < initialPairCount)  // 链接字段优先
              .map(f => ({value: f.code, label: `${f.code} (${f.type})`}))
            }
          />
        </td>
        <td><Button onClick={() => removePair(i)}>×</Button></td>
      </tr>
    ))}
  </tbody>
</table>
```

**数据契约**：`linkFields: Array<{parent: string, child: string}>`

---

## 8. 数据模型扩展

### 8.1 form_section 新表

```sql
-- 在 V3 基础上扩展，加一个新表
CREATE TABLE form_section (
    id            BIGINT  PRIMARY KEY,
    schema_id     BIGINT  NOT NULL,          -- 引用 form_schema.id
    name          VARCHAR(128) NOT NULL,
    description   TEXT,
    sort_order    INT     NOT NULL DEFAULT 0,
    create_time   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_section_schema ON form_section(schema_id) WHERE deleted = 0;

ALTER TABLE form_field_def
    ADD COLUMN section_id BIGINT NULL,
    ADD CONSTRAINT fk_field_section FOREIGN KEY (section_id) REFERENCES form_section(id) ON DELETE SET NULL;
```

### 8.2 form_field_def 扩展

新增字段：

```sql
ALTER TABLE form_field_def
    ADD COLUMN config JSONB NULL;  -- 类型特定配置（reference 时存 targetFormId 等）
```

现有 `form_field_def` 已有 `config String`（由 sub-project 2 的 JSONB TypeHandler 处理）。现在升级为 JSONB 类型以支持结构化查询；存量数据需 migration。

### 8.3 form_relationship 升级

现有 `child_link_field VARCHAR(64)` 升级为多字段 JSONB：

```sql
ALTER TABLE form_relationship
    ADD COLUMN link_fields JSONB NULL;  -- [{parent: "id", child: "order_id_ref"}, ...]
```

存量数据：原 `child_link_field='order_id_ref'` 转换为 `link_fields=[{parent: 'id', child: 'order_id_ref'}]`。

### 8.4 字段类型 'subform' 表达

子表单容器作为特殊"字段"出现在 form_field_def 中：

| 列 | 值 |
|---|---|
| `type` | `'subform'` |
| `code` | 唯一 code（如 `subform_order_items`） |
| `name` | 显示名（用户可编辑，默认是子表单名） |
| `target_column` | NULL（不映射到列） |
| `config` | `{"subformRefId": 101, "isList": true, "linkFields": [...]}` |
| `is_link_field` | false |

运行时引擎读取 `config.subformRefId` + `form_relationship` 找到对应的子表单。

---

## 9. 关键 API 集成（sub-project 2 已交付）

| 用途 | 端点 |
|---|---|
| 列表 | `GET /api/forms` |
| 创建 | `POST /api/forms` |
| 详情 | `GET /api/forms/{formId}` / `/api/forms/{formId}/schema` |
| 列表字段 | `GET /api/forms/{formId}/fields` |
| 添加字段 | `POST /api/forms/{formId}/fields` |
| 更新字段 | `PUT /api/forms/{formId}/fields/{fieldId}` |
| 删字段 | `DELETE /api/forms/{formId}/fields/{fieldId}` |
| 重排字段 | `PUT /api/forms/{formId}/fields/reorder` |
| 列表关系 | `GET /api/forms/{formId}/relationships` |
| 创建关系 | `POST /api/forms/{formId}/relationships` |
| 业务主键 | `GET /api/forms/{formId}/business-key` + `PUT` |
| **发布新版本** | `PUT /api/forms/{formId}/schema` （核心，提交完整 schema） |
| 列表版本 | `GET /api/forms/{formId}/versions` |
| 表 introspection | `GET /api/admin/db/tables` / `/tables/{t}/columns` |

**"发布新版本"是关键调用**：designer 把当前 draft state 打包成 `UpdateSchemaRequest`：

```typescript
{
  name: string,
  description: string,
  fields: CreateFieldRequest[],          // 全部字段（含 type='subform'、type='section' 不在这里）
  relationships: CreateRelationshipRequest[]  // 全部关系
}
```

**`CreateFieldRequest`**：
```typescript
{
  code: string,                          // 字段 code
  name: string,                          // 显示名
  type: string,                          // 字段类型（含 'subform'）
  required?: boolean,
  sortOrder?: number,
  config?: object,                       // JSONB config
  validation?: object,                   // JSONB validation
  targetColumn?: string                  // mapped 时必填
}
```

注意：**section 字段不进 `fields` 数组**——它通过新表 `form_section` 单独管理，fields 数组里只有 `section_id` 外键引用。

### 9.1 section 在发布版本里的处理

由于 `form_field_def` 数组里不直接包含 section，发布时：

1. PUT `/api/forms/{formId}/fields/reorder` 更新字段顺序
2. 单独创建/更新 `form_section` 行（需要新加 `POST /api/forms/{formId}/sections` API）
3. 单独更新每个字段的 `section_id`（PUT `/api/forms/{formId}/fields/{fid}` 增加可选 section_id 字段）

**新 API**（子项目 3 需要 sub-project 2 配合添加）：

```
POST   /api/forms/{formId}/sections
GET    /api/forms/{formId}/sections
PUT    /api/forms/{formId}/sections/{secId}
DELETE /api/forms/{formId}/sections/{secId}
```

`CreateFieldRequest` 增 `sectionId?: number` 字段。

**这是 sub-project 3 对 sub-project 2 的扩展依赖**。需要在子项目 3 启动时**先扩展 sub-project 2 的 API + V5 migration**。

---

## 10. 子项目间依赖

| 子项目 | 依赖关系 |
|---|---|
| 1. 基础设施层 | 无（已交付）|
| 2. 后端引擎 | 1 |
| **3. 设计器** | **1 + 2**，**对 2 有扩展**：新增 V5 migration（form_section 表）、`form_field_def` 加 section_id 列、CreateFieldRequest 加 sectionId 字段、新增 4 个 sections API |
| 4. 嵌入组件 | 1 + 2，**复用 3 的设计器运行时预览** |

子项目 3 启动前，需要对子项目 2 做小幅扩展（V5 migration + 4 个新 API）。这部分**作为子项目 3 的"第 0 步"**，由子项目 3 的执行一并完成。

---

## 11. 实现架构

### 11.1 文件结构

```
frontend/apps/platform-admin/src/
├── pages/
│   ├── Designer/
│   │   ├── FormListPage.tsx           列表页
│   │   └── DesignerPage.tsx          设计器主页面
│
├── features/
│   └── designer/
│       ├── components/
│       │   ├── TopBar.tsx
│       │   ├── ComponentLibrary.tsx
│       │   ├── ComponentCard.tsx
│       │   ├── Canvas.tsx
│       │   ├── CanvasField.tsx
│       │   ├── CanvasSection.tsx
│       │   ├── SubformContainer.tsx
│       │   ├── PropertyPanel.tsx
│       │   ├── SubformConfigDrawer.tsx
│       │   ├── LinkFieldsEditor.tsx
│       │   ├── ValidationEditor.tsx
│       │   ├── ValidationEditorModal.tsx
│       │   ├── PreviewDrawer.tsx
│       │   ├── SectionListManager.tsx
│       │   ├── CreateFormModal.tsx
│       │   └── FieldTypeIcon.tsx
│       └── hooks/
│           ├── useSchema.ts
│           ├── useFieldTypes.ts
│           ├── useTables.ts
│           ├── useBusinessKeys.ts
│           └── useSectionList.ts
│
├── services/
│   └── designer/
│       ├── designerApi.ts            fetch 封装
│       ├── designerStore.ts          Zustand store
│       ├── schemaDiff.ts             草稿 vs 发布 diff
│       └── dndHelpers.ts             拖拽工具
│
├── types/
│   └── designer.ts                    designer 专用类型
│
└── routes/
    └── designer.tsx                   路由配置
```

### 11.2 关键 hooks / services 接口

```typescript
// designerApi.ts
export const designerApi = {
  listForms: (q: PageQuery) => api.get<PageResult<FormVO>>('/forms'),
  createForm: (req: CreateFormRequest) => api.post<Long>('/forms', req),
  getForm: (id: Long) => api.get<SchemaDetailVO>(`/forms/${id}/schema`),
  getVersions: (id: Long) => api.get<SchemaVersionVO[]>(`/forms/${id}/versions`),
  publishNewVersion: (id: Long, req: UpdateSchemaRequest) => api.put<Long>(`/forms/${id}/schema`, req),
  listFields: (id: Long) => api.get<FormFieldDefVO[]>(`/forms/${id}/fields`),
  addField: (id: Long, req: CreateFieldRequest) => api.post<Long>(`/forms/${id}/fields`, req),
  updateField: (id: Long, fid: Long, req: UpdateFieldRequest) => api.put(`/forms/${id}/fields/${fid}`, req),
  deleteField: (id: Long, fid: Long) => api.delete(`/forms/${id}/fields/${fid}`),
  listRelationships: (id: Long) => api.get<RelationshipVO[]>(`/forms/${id}/relationships`),
  getBusinessKeys: (id: Long) => api.get<FormBusinessKey[]>(`/forms/${id}/business-key`),
  setBusinessKeys: (id: Long, fieldIds: Long[]) => api.put(`/forms/${id}/business-key`, fieldIds),

  // 新增 (sub-project 2 扩展)
  listSections: (id: Long) => api.get<SectionVO[]>(`/forms/${id}/sections`),
  createSection: (id: Long, req: CreateSectionRequest) => api.post<Long>(`/forms/${id}/sections`, req),
  updateSection: (id: Long, secId: Long, req: UpdateSectionRequest) => api.put(`/forms/${id}/sections/${secId}`, req),
  deleteSection: (id: Long, secId: Long) => api.delete(`/forms/${id}/sections/${secId}`),

  // DB introspection (已有)
  listUserTables: () => api.get<string[]>('/admin/db/tables'),
  listTableColumns: (table: string) => api.get<ColumnInfo[]>(`/admin/db/tables/${table}/columns`),
};

// designerStore.ts (Zustand)
interface DesignerState {
  // 草稿状态
  draftFields: FormFieldDefVO[];        // 字段草稿（含 type='subform'）
  draftSections: SectionVO[];           // 分组草稿
  draftRelationships: RelationshipVO[]; // 关系草稿
  selectedFieldId: Long | null;
  // 同步到后端
  saveDraft: () => Promise<void>;
  publish: () => Promise<Long>;         // returns new schemaId
  // 字段操作（本地）
  addField: (type: string, atIndex?: number) => void;
  updateField: (id: Long, patch: Partial<FormFieldDefVO>) => void;
  removeField: (id: Long) => void;
  reorderFields: (orderedIds: Long[]) => void;
  // 分组操作
  addSection: (name: string) => void;
  updateSection: (id: Long, patch: Partial<SectionVO>) => void;
  removeSection: (id: Long) => void;
  // 关系操作
  addSubformContainer: (subformRefId: Long, linkFields: LinkFieldPair[]) => void;
  updateSubformConfig: (id: Long, patch: ...) => void;
  // 选中
  selectField: (id: Long | null) => void;
}
```

### 11.3 拖拽实现（dnd-kit）

```typescript
import { DndContext, useDraggable, useDroppable, SortableContext, arrayMove } from '@dnd-kit/core';

// ComponentLibrary 用 useDraggable
function ComponentCard({ type }: { type: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `library-${type}`,
    data: { source: 'library', type },
  });
  return <div ref={setNodeRef} {...listeners} {...attributes}>...</div>;
}

// Canvas 用 useDroppable + SortableContext
function Canvas({ fields }: { fields: Field[] }) {
  return (
    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
      {fields.map(f => <SortableCanvasField key={f.id} field={f} />)}
    </SortableContext>
  );
}

// onDragEnd 处理
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  if (active.data.current?.source === 'library') {
    // 从库拖入：在 over 位置插入新字段
    const type = active.data.current.type;
    addField(type, getIndex(over.id));
  } else {
    // 画布内重排
    if (active.id !== over.id) {
      reorderFields(arrayMove(fields, getIndex(active.id), getIndex(over.id)));
    }
  }
}
```

---

## 12. 数据流 Trace

### 12.1 用户加载设计器

```
1. 路由 /designer/100 触发
2. DesignerPage 加载
3. useSchema(100) → GET /api/forms/100/schema
4. 服务端返回 SchemaDetailVO（fields + relationships + target_table）
5. designerStore 初始化 draftFields = response.fields
6. Canvas 渲染所有 fields
7. PropertyPanel 显示空（无选中）
```

### 12.2 用户添加一个字段

```
1. 用户点击 ComponentLibrary 的"文本"卡片 [+] 按钮（或拖入）
2. designerStore.addField('text')
3. Zustand: draftFields = [...draftFields, newField]
4. Canvas 自动重渲染，新字段出现在末尾
5. 自动 selectField(newField.id)
6. PropertyPanel 显示新字段的属性
7. 用户填入 code、name，必填勾选等
8. 改动实时更新到 designerStore（不调用后端）
```

### 12.3 用户保存草稿

```
1. 用户点"💾 保存草稿"
2. designerStore.saveDraft()
3. 组装请求：
   - PATCH /api/forms/100/fields（每个新/改的字段）
   - POST /api/forms/100/relationships（新增关系）
   - PUT /api/forms/100/business-key
   - POST /api/forms/100/sections（新增 section）
4. 服务端在当前 schema_id 上写新数据（schema 本身不动；is_current 仍 false）
5. 客户端显示"草稿已保存"
```

### 12.4 用户发布新版本

```
1. 用户点"📤 发布新版本"
2. 确认 Modal："将创建 v4，v3 不可再修改"
3. designerStore.publish()
4. 组装 UpdateSchemaRequest（含全部 fields + relationships + 新的 sections 列表）
5. PUT /api/forms/100/schema
6. 服务端执行 publishNewVersion：
   a. 创建新 form_schema 行 (version=v4, is_current=true)
   b. 复制旧 fields 到新 schema_id
   c. 应用新 fields
   d. 复制旧 relationships
   e. 应用新 relationships
   f. 复制旧 sections
   g. 应用新 sections
   h. 旧 schema is_current=false
7. 响应新 schemaId
8. 客户端：designerStore 替换 draft 状态为新版本数据
9. TopBar 版本号更新为 v4
```

### 12.5 用户配置子表单

```
1. 用户从组件库拖入"子表单"卡片
2. designerStore.addField('subform')
3. 弹出 SubformConfigDrawer
4. 用户选目标表单（form 101 = 订单项）
5. designerStore.loadChildFields(101) → GET /api/forms/101/schema
6. 显示子表单字段预览
7. 用户勾选"是否为列表"
8. 用户配置链接字段对：
   - designerStore.getBusinessKeys(100) → GET /api/forms/100/business-key
   - 显示父表单业务主键字段（带 ⭐）
   - 用户选父字段 + 对应子字段
   - 可"+ 添加链接字段对"加多对
9. 用户选 on_delete
10. 点"保存"→ designerStore.updateSubformConfig(fieldId, {...})
11. 关闭 Drawer，Canvas 显示子表单容器（只读预览）
```

---

## 13. 测试策略

- **单元测试**：designerStore 状态机、schemaDiff、dndHelpers
- **组件测试**（@testing-library/react）：ComponentLibrary、Canvas、PropertyPanel、LinkFieldsEditor
- **集成测试**（MSW mock backend）：完整 designer 工作流
- **E2E**（Playwright，可选）：用户登录 → 打开 designer → 添加字段 → 保存草稿 → 发布

---

## 14. 开放问题

1. **撤销栈**（Ctrl+Z）—— MVP 不做；后续可加
2. **多用户协作** —— 不做；MVP 假设单人编辑
3. **权限模型** —— 延后（与基础设施层一致）
4. **字段类型扩展** —— 通过后端 FieldTypeRegistry 自动支持，新增类型无需改 designer
5. **移动端适配** —— MVP 假设桌面端（≥1280px）

---

## 15. 决策汇总

| 维度 | 决策 |
|---|---|
| 整体布局 | 三栏（260 / flex / 340 px）|
| 组件库 | 6 个分类，10 字段 + 2 容器 |
| 字段添加 | 双模式：点击+ / 拖拽 |
| 画布 | 扁平 + 分组容器 |
| 分组 | 独立容器组件，仅影响显示，form_section 表 |
| 子表单 | 独立容器组件，配置在父表单侧（点容器弹窗）|
| 链接字段 | 多对 JSONB 数组，父业务主键优先 |
| 字段映射 | 属性面板内联 + 类型感知（reference 专门配置）|
| target_table | 创建时设定，不可修改 |
| 保存/发布 | 草稿+发布（sub-project 2 immutable 版本契合）|
| 入口 | 顶级菜单"📋 表单设计器" |
| 拖拽库 | dnd-kit（@dnd-kit/core + @dnd-kit/sortable）|
| 状态管理 | TanStack Query（server）+ Zustand（draft）+ useState（UI）|
| 对子项目 2 的扩展 | V5 migration + 4 个 sections API |
