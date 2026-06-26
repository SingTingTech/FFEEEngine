# 表单 Schema 与后端引擎设计

| 项目 | safeValidator |
|---|---|
| 文档版本 | 1.0 |
| 日期 | 2026-06-26 |
| 范围 | **子项目 2**（4 个子项目中的第 2 个）|
| 父项目 | [基础设施层](2026-06-25-infrastructure-layer-design.md) |
| 子项目 | 3. 表单设计器前端 · 4. 嵌入组件库 |

---

## 1. 背景与目标

### 1.1 子项目 2 范围

实现表单引擎的**后端核心**：表单元数据管理、字段映射、校验执行、嵌套关系、引用查找、动态数据存储与查询。

**包含**：
- 表单 schema / 字段 / 关系 / 业务主键的元数据管理 API
- 表单数据的提交、查询、更新、删除（含父子嵌套 + 事务）
- 字段类型注册表（含内置 10 种类型 + 扩展接口）
- 校验规则注册表（含内置 9 个规则 + 扩展接口）
- 类型转换器注册表（display type ↔ storage type，含 9 个内置 converter）
- 数据库表/列自省 API（设计器用）
- 表单间引用 lookup API

**不包含**（后续子项目）：
- 设计器 UI（子项目 3）
- 嵌入组件库（子项目 4）
- 权限系统（明确延后）

### 1.2 启动验证清单（子项目 2 完成定义）

- [ ] `POST /api/forms` 创建表单，Flyway V3 迁移成功
- [ ] Designer 调 `GET /api/admin/db/tables` 列出用户表 + 调 `GET /api/admin/db/tables/{t}/columns` 看列
- [ ] 创建"订单"表单（mapped → `orders` 表），字段都映射
- [ ] 创建"订单项"表单（unmapped → form_data）
- [ ] 配置父子关系：订单→订单项，child_link_field=`order_id_ref`
- [ ] `POST /api/forms/{orderFormId}/records` 单请求提交父+2 个子，事务原子
- [ ] `GET /api/forms/{orderFormId}/records/{id}` 返回父 + 子记录列表
- [ ] 删父记录 → 子记录级联删除
- [ ] 加新字段到"订单" → schema 升 v2，验证旧记录仍可读（schema-on-read）
- [ ] 创建 `reference` 类型字段 + lookup API 正常返回选项

---

## 2. 架构概览

### 2.1 模块位置

子项目 2 全部实现在 `safe-validator-form` 模块（基础设施层已建好 package-info.java 占位）。

### 2.2 数据流分层

```
┌────────────────────────────────────────────────────────────┐
│  Controller 层 (form.schema.controller / form.runtime.controller) │
│  - 接收 HTTP 请求、参数校验、返回统一 Result<T>              │
└─────────────────┬──────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────┐
│  Service 层 (FormSchemaService / FormDataService / ...)      │
│  - 事务编排、调用 engine + 注册表                            │
└─────────────────┬──────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────┐
│  Engine 层 (MappingEngine / ValidationEngine / CascadeDelete) │
│  - 纯计算逻辑：构造 SQL、运行校验、类型转换                 │
│  - 无状态，可独立单元测试                                   │
└─────────────────┬──────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────┐
│  Registry 层 (FieldTypeRegistry / ValidationRuleRegistry / ...) │
│  - 通过 Spring 注入所有 FieldType / Rule / Converter Bean   │
│  - 未来加类型只需新增 @Component + 重启                     │
└────────────────────────────────────────────────────────────┘
```

---

## 3. 数据库 Schema

### 3.1 form_schema（每个版本一行）

```sql
CREATE TABLE form_schema (
    id            BIGINT       PRIMARY KEY,
    form_id       BIGINT       NOT NULL,                  -- 逻辑表单 ID（跨版本共享）
    version       INT          NOT NULL,
    name          VARCHAR(128) NOT NULL,
    description   TEXT,
    status        SMALLINT     NOT NULL DEFAULT 1,        -- 1=DRAFT, 2=PUBLISHED, 3=ARCHIVED
    target_table  VARCHAR(128),                            -- NULL = unmapped (form_data); 非空 = 映射用户表
    is_current    BOOLEAN      NOT NULL DEFAULT false,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0,
    UNIQUE (form_id, version)
);
CREATE INDEX idx_form_schema_current ON form_schema(form_id) WHERE is_current = true AND deleted = 0;
```

**约定**：
- 一个 form_id 可以有多个 version 的行，但 is_current=true 的**只有一行**（DB 层不强制，靠应用层约束 + 部分唯一索引）
- 修改 schema 结构 = 复制旧行创建新 version，旧行变 is_current=false
- target_table 为 NULL = unmapped 走 form_data；非空 = 写入用户预定义表

### 3.2 form_field_def（属于某个 schema 版本）

```sql
CREATE TABLE form_field_def (
    id            BIGINT       PRIMARY KEY,
    schema_id     BIGINT       NOT NULL,                  -- 引用 form_schema.id
    code          VARCHAR(64)  NOT NULL,                  -- 字段业务标识
    name          VARCHAR(128) NOT NULL,                  -- 显示名
    type          VARCHAR(32)  NOT NULL,                  -- text/number/date/.../reference
    required      BOOLEAN      NOT NULL DEFAULT false,
    default_value TEXT,
    sort_order    INT          NOT NULL DEFAULT 0,
    config        JSONB,                                  -- 类型特定配置（reference 时存 targetFormId 等）
    validation    JSONB,                                  -- 校验规则
    target_column VARCHAR(128),                          -- mapped 时存储列名；unmapped 时为 NULL
    is_link_field BOOLEAN      NOT NULL DEFAULT false,   -- 标记被某 relationship 用作 linking field
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_field_def_schema ON form_field_def(schema_id) WHERE deleted = 0;
CREATE UNIQUE INDEX uk_form_field_def_code ON form_field_def(schema_id, code) WHERE deleted = 0;
```

**重要约束**：
- 如果 `form_schema.target_table` 非空，则**每个字段的 target_column 都必填**（应用层校验）
- 如果 `is_link_field = true`，则 UI 隐藏、用户不可见、且不允许删除（设计器阻止）

### 3.3 form_relationship（父子关系）

```sql
CREATE TABLE form_relationship (
    id                BIGINT       PRIMARY KEY,
    schema_id         BIGINT       NOT NULL,              -- 属于哪个 schema 版本
    parent_form_id    BIGINT       NOT NULL,              -- 父表单（逻辑 ID）
    child_form_id     BIGINT       NOT NULL,              -- 子表单（逻辑 ID）
    relation_type     VARCHAR(16)  NOT NULL,              -- ONE_TO_ONE | ONE_TO_MANY
    parent_link_field VARCHAR(64),                        -- 父表单字段 code（当前激活版本）；可空
    child_link_field  VARCHAR(64) NOT NULL,               -- 子表单字段 code（当前激活版本）
    on_delete         VARCHAR(16)  NOT NULL DEFAULT 'CASCADE',  -- CASCADE | SET_NULL | RESTRICT
    create_time       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by         BIGINT,
    update_by         BIGINT,
    deleted           SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_relationship_schema ON form_relationship(schema_id) WHERE deleted = 0;
CREATE INDEX idx_form_relationship_parent ON form_relationship(parent_form_id) WHERE deleted = 0;
CREATE INDEX idx_form_relationship_child ON form_relationship(child_form_id) WHERE deleted = 0;
```

**约束**：
- `child_link_field` 引用的子表单字段必须 `required = true`（应用层校验）
- 创建 relationship 时自动把子表单对应 field 的 `is_link_field` 设为 `true`
- 删除 relationship 时自动把 `is_link_field` 还原为 `false`

### 3.4 form_business_key（业务主键，复合主键支持）

```sql
CREATE TABLE form_business_key (
    id         BIGINT  PRIMARY KEY,
    form_id    BIGINT  NOT NULL,                          -- 逻辑 form_id
    field_id   BIGINT  NOT NULL,                          -- 引用 form_field_def.id
    key_order  INT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted    SMALLINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_form_business_key_field ON form_business_key(form_id, field_id) WHERE deleted = 0;
```

**写入时**：
- 引擎按 `key_order` 升序遍历 key fields
- 拼接 WHERE 条件查重（mapped 表 → `WHERE col1=? AND col2=?`；form_data → `data @> '{...}'::jsonb`）
- 命中 → UPDATE；未命中 → INSERT

### 3.5 form_data（仅未映射表单使用）

```sql
CREATE TABLE form_data (
    id          BIGINT       PRIMARY KEY,
    form_id     BIGINT       NOT NULL,                    -- 逻辑 form_id
    data        JSONB        NOT NULL,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_data_form ON form_data(form_id) WHERE deleted = 0;
CREATE INDEX idx_form_data_data_gin ON form_data USING GIN (data);
```

**`data` 结构**：`{ "field_code_1": value1, "field_code_2": value2, ... }`

**不存 schema_id** — schema-on-read 模型（见 §6.4）。

---

## 4. 字段类型系统

### 4.1 `FieldType` 抽象

```java
public interface FieldType {
    String name();                                    // 唯一标识 → DB 的 type 字段
    String label();                                   // UI 标签
    String description();

    /** 类型配置 schema（design 端动态渲染字段编辑表单用） */
    default ConfigSchema configSchema() { return ConfigSchema.empty(); }

    /** 提交时把前端发来的值解析为该类型的内部表示 */
    Object parseValue(Object rawValue);

    /** 序列化为目标存储类型（mapped 时由 TypeConverter 接管） */
    Object toStorageValue(Object displayValue, TypeConverterRegistry registry);

    /** 反序列化 */
    Object fromStorageValue(Object storageValue, TypeConverterRegistry registry);

    /** 该类型可用的校验规则名 */
    Set<String> applicableRules();
}
```

### 4.2 MVP 内置 10 个类型

| name | label | config 关键字段 | 默认校验规则 |
|---|---|---|---|
| `text` | 文本 | `maxLength: number` | required, minLength, maxLength, pattern |
| `longtext` | 长文本 | `rows: number` | required, minLength, maxLength |
| `number` | 数字 | `precision, scale, integer` | required, min, max, integer |
| `boolean` | 布尔 | — | required |
| `date` | 日期 | `format: "yyyy-MM-dd"` | required, minDate, maxDate |
| `datetime` | 日期时间 | `format: "yyyy-MM-dd HH:mm:ss"` | required, minDate, maxDate |
| `select` | 单选 | `options: [{label, value}]` | required, inOptions |
| `multiselect` | 多选 | `options: [{label, value}]` | required, minItems, maxItems |
| `file` | 文件 | `maxSize, allowedTypes, storage` | required, maxSize, allowedTypes |
| `reference` | 引用 | `referenceFormId, referenceDisplayField, referenceStorageAs` | required, referenceExists |

### 4.3 扩展方式

新增类型：

```java
@Component
public class RichTextFieldType implements FieldType {
    public String name() { return "rich_text"; }
    public String label() { return "富文本"; }
    // ... 实现其他方法
}
```

启动时 `@Component` 扫描自动注册到 `FieldTypeRegistry`。**不需要改 schema、不需要改 API 契约**。

---

## 5. 校验规则系统

### 5.1 `ValidationRule` 抽象

```java
public interface ValidationRule {
    String name();                       // "required" / "minLength" / "pattern" ...
    String label();
    Set<String> applicableTypes();       // 适用字段类型；空集 = 全部

    /** 校验值；返回错误信息（null = 通过） */
    String validate(Object value, Object ruleConfig, FieldContext ctx);
}
```

### 5.2 MVP 内置 9 个规则

| name | 参数 (ruleConfig) | 说明 |
|---|---|---|
| `required` | `boolean` | 必填 |
| `minLength` | `int` | 文本最短长度 |
| `maxLength` | `int` | 文本最长长度 |
| `min` | `number` / `string` | 数值/日期下限 |
| `max` | `number` / `string` | 数值/日期上限 |
| `pattern` | `string` (regex) | 正则 |
| `integer` | `boolean` | 必须整数 |
| `inOptions` | `array` | 必须在选项列表中（select/multiselect 强校验） |
| `minItems` / `maxItems` | `int` | 数组长度边界 |

**`validation JSONB` 形如**：

```json
{
  "required": true,
  "requiredMessage": "客户名称不能为空",
  "minLength": 2,
  "maxLength": 128,
  "pattern": "^[A-Za-z0-9_-]+$",
  "patternMessage": "只能包含字母数字和下划线"
}
```

### 5.3 校验流程

```
1. [ValidationEngine.validateField] 对单字段：
   a. 解析 field.validation JSONB
   b. 对每个 rule（仅 applicableTypes 命中的）：
      - 调用 rule.validate(value, ruleConfig, ctx)
      - 失败 → 加入 FieldError{field, code, message}
   c. 特殊处理 reference 类型：额外调用 reference existence check
2. [validateForm] 遍历父 + children → 聚合 errors
3. 失败 → 抛 BizException(VALIDATION_FAILED) 含 errors 列表
```

---

## 6. 类型转换系统

### 6.1 `TypeConverter` 抽象

```java
public interface TypeConverter {
    /** 该 converter 能处理的源 display types */
    Set<String> sourceTypes();
    /** 该 converter 能处理的目标 storage types (e.g. "varchar", "int", "date") */
    Set<String> targetTypes();
    /** 转换；失败抛 IllegalArgumentException */
    Object convert(Object value);
}
```

### 6.2 MVP 内置 9 个 converter

| converter | source → target | 用途 |
|---|---|---|
| `PassthroughConverter` | 任意 → 任意 | 同类型（默认） |
| `StringToDateConverter` | text/date → date/datetime | VARCHAR 列存日期 |
| `StringToNumberConverter` | text/number → number | VARCHAR 列存数字 |
| `StringToBooleanConverter` | text/boolean → boolean | VARCHAR 列存布尔 |
| `NumberToStringConverter` | number → text | 数字 → VARCHAR |
| `DateToStringConverter` | date/datetime → text | 日期 → VARCHAR |
| `BooleanToNumberConverter` | boolean → number | BOOLEAN → 0/1 |
| `JsonNodeConverter` | 任意 → jsonb | 对象/数组 → JSONB |
| `MultiselectToJsonbConverter` | multiselect → jsonb | 多选数组 → JSONB 数组 |

### 6.3 写入流程

```
1. 引擎从 form_field_def 读 type（display）
2. 引擎查 target_column 推断 storage type（ColumnIntrospector.listColumns）
3. 在 TypeConverterRegistry 查找匹配的 converter
4. 调用 converter.convert(displayValue) → storage value
5. 写入 SQL 用 storage value 作为参数
```

### 6.4 列类型推断

`ColumnIntrospector` 通过 JDBC `DatabaseMetaData.getColumns()` 查表列定义：

```java
public record ColumnInfo(String name, int jdbcType, String typeName, boolean nullable, int size) {}
```

`typeName` 是 PG 类型名（`varchar`, `int4`, `int8`, `numeric`, `date`, `timestamp`, `jsonb`, `bool` ...）。Converter registry 知道怎么把 `typeName` 映射到自己的 `targetTypes()`。

---

## 7. Reference 字段类型

### 7.1 配置

`form_field_def.config`（`type='reference'` 时）：

```json
{
  "referenceFormId": 42,                 // 目标 form_id（逻辑）
  "referenceDisplayField": "customer_name",  // 目标表单里用于显示的字段 code
  "referenceStorageAs": "bigint",         // 存到列时是 bigint 还是 varchar
  "referenceFilter": {                    // 可选
    "where": "status = 1"
  }
}
```

### 7.2 存储

- **mapped 父表单**：存到 `target_column`（按 `referenceStorageAs` 选 storage 类型）
- **unmapped 父表单**：存到 JSONB 中以 `field.code` 为 key

### 7.3 写入校验

提交时校验引用存在：

```sql
-- mapped 目标
SELECT 1 FROM <target_table> WHERE id = ? AND deleted = 0

-- unmapped 目标
SELECT 1 FROM form_data WHERE id = ? AND form_id = ? AND deleted = 0
```

### 7.4 lookup API

```
GET /api/forms/{formId}/records/lookup?keyword=&pageNum=1&pageSize=20
```

返回 `{records: [{id, display}], total, pageNum, pageSize}`。

`display` = `referenceDisplayField` 字段值。SQL：
- mapped: `SELECT id, <refCol> AS display FROM <table> WHERE <refCol> LIKE ? AND deleted=0`
- unmapped: `SELECT id, data->>? AS display FROM form_data WHERE form_id=? AND data->>? LIKE ? AND deleted=0`

### 7.5 reference vs form_relationship

| | reference 字段 | 父子表单（form_relationship） |
|---|---|---|
| 关系 | 软引用（FK 字段） | 结构化父子（一行带多行） |
| 数量 | 1 个字段值 = 1 个引用 | 1:N 多子行 |
| 存储 | 父表单内一列 / 一个 JSONB 键 | 独立行（不同表 / 不同 form_data row） |
| 提交 | 随父表单 | 随父表单（事务原子） |
| 例子 | 订单的"客户"字段 | 订单的"订单项"列表 |

两者**可以共存**：一个订单既有 `customer` reference 字段，又有 0..N 订单项。

---

## 8. 业务主键

### 8.1 行为

写入时按业务主键查重：
- 命中 → UPDATE
- 未命中 → INSERT

**mapped 表查重 SQL**：
```sql
SELECT id FROM <target_table>
WHERE <col1> = ? AND <col2> = ? AND deleted = 0
LIMIT 1
```

**form_data 查重**：
```sql
SELECT id FROM form_data
WHERE form_id = ? AND data @> '{...}'::jsonb AND deleted = 0
LIMIT 1
```

### 8.2 业务主键配置

`form_business_key` 表存 `form_id` + `field_id` + `key_order`。写入时按 `key_order` 升序遍历。

设计器 UX：字段编辑面板有"是否业务主键"勾选框。同一表单可勾选 1+ 字段组成复合主键。保存 schema 时校验：业务主键字段必须必填。

---

## 9. Schema 版本化

### 9.1 修改流程

```
PUT /api/forms/{formId}/schema
{ fields: [...], relationships: [...] }

1. 事务开始
2. 查当前 form_schema (formId, is_current=true) → 旧 schema_id, old_version
3. 创建新 form_schema 行 (form_id, version=old_version+1, is_current=true)
   → 新 schema_id
4. 复制旧 form_field_def 行 → 新行 (schema_id=新, id=新雪花)
5. 应用新 fields 配置（update/insert/delete）
6. 复制旧 form_relationship → 新行
7. 旧 schema 行 UPDATE is_current=false
8. 事务提交
9. 旧 schema 数据完全不动（immutable 历史）
```

### 9.2 schema-on-read

**`form_data` 不存 `schema_id`**。读写数据时统一用 **当前版本**（is_current=true）解释。

- 删字段：旧数据保留 key（读时忽略）
- 加字段：旧数据没 key（读时返回 null）
- 重命名字段：旧数据保留旧 key（读时按新 key 查 = null），边界可接受

### 9.3 API 返回 version

读数据 API 响应包含 `formVersion` 字段，告知客户端"按哪个 schema 解释"。

### 9.4 mapped 表的特殊性

- 表是用户预定义的，结构稳定
- 映射配置变了，旧数据 + 旧映射 + 新映射都 OK（映射只是路由）
- **不需要 data-version 跟踪**

---

## 10. 父子表单提交

### 10.1 单请求提交

```json
POST /api/forms/{formId}/records
{
  "data": { ... },          // 父表单数据（不含 linking 字段）
  "children": [
    { "formId": 101, "data": { ... } },
    { "formId": 101, "data": { ... } }
  ]
}
```

### 10.2 事务流程

```
@Transactional
public FormSubmitResult submit(FormSubmitRequest req) {
    1. 加载父 form_schema 当前版本 + fields + relationships
    2. ValidationEngine.validateForm 校验所有父子数据
    3. 保存父记录
       - mapped: MappingEngine.buildInsert → INSERT INTO <table>
       - unmapped: INSERT INTO form_data
       → 拿到 parentId
    4. 遍历 children
       对每个 child:
       a. 注入 linking 字段: data[child_link_field] = parentId
       b. 校验子
       c. 加载子 form_schema 当前版本 + fields
       d. 写子记录（同父逻辑）
       → 记录 childRecordId
    5. 任一步失败 → 整个事务回滚
    6. 返回 { id: parentId, childResults: [{formId, recordId}] }
}
```

### 10.3 linking 字段自动注入

引擎在 `data` 中**自动**设置 `data[child_link_field] = parentId`：
- 如果 key 已存在 → 覆盖（用户填的值以 engine 为准）
- 如果 key 不存在 → 新增

读取时**自动隐藏** linking 字段（API 返回前剔除），用户不会看到。

---

## 11. 级联删除

### 11.1 默认策略

| 关系类型 | 默认 on_delete | 行为 |
|---|---|---|
| ONE_TO_MANY | CASCADE | 删父 → 删所有子 |
| ONE_TO_ONE | RESTRICT | 有子时阻止删父 |

可在 form_relationship 创建时覆盖默认。

### 11.2 实现

```
@Transactional
public void deleteParent(Long formId, Long recordId) {
    1. 查 form_relationship WHERE parent_form_id = formId AND deleted=0
    2. 对每个 1:N relationship：
       - mapped child: DELETE FROM <target_table> WHERE <linking_col> = ?
       - unmapped child: UPDATE form_data SET deleted=1 WHERE data->>? = ?
    3. 对每个 1:1 relationship：
       - RESTRICT: 查子存在 → 抛 FORM_RELATIONSHIP_BLOCKED
       - SET_NULL: 把子的 linking 字段设为 null
       - CASCADE: 删子
    4. 删父记录
    5. 事务提交
}
```

---

## 12. API 契约

### 12.1 表单元数据 API

```
GET    /api/forms                                  列表（分页 + 搜索）
GET    /api/forms/{formId}                         详情（最新版本 + fields + relationships）
GET    /api/forms/{formId}/schema                  当前版本详情
GET    /api/forms/{formId}/versions                列出所有版本
GET    /api/forms/{formId}/versions/{ver}         获取指定版本

POST   /api/forms                                  新建 form (v1)
PUT    /api/forms/{formId}/schema                  创建新版本（结构修改总是产生新版本）
PUT    /api/forms/{formId}                         更新 name/description/status（不修改结构）
DELETE /api/forms/{formId}                         软删

POST   /api/forms/{formId}/fields                  新增字段
PUT    /api/forms/{formId}/fields/{fid}            更新字段
DELETE /api/forms/{formId}/fields/{fid}            删字段（被引用则阻止）
PUT    /api/forms/{formId}/fields/reorder          批量重排

POST   /api/forms/{formId}/relationships           新增
DELETE /api/forms/{formId}/relationships/{rid}     删除

GET    /api/forms/{formId}/business-key           获取
PUT    /api/forms/{formId}/business-key           一次性覆盖设置
```

### 12.2 表单数据 API（运行时）

```
POST   /api/forms/{formId}/records                 提交（带 children）
GET    /api/forms/{formId}/records                 分页列表
GET    /api/forms/{formId}/records/{rid}           单条详情（含 children）
PUT    /api/forms/{formId}/records/{rid}           更新
DELETE /api/forms/{formId}/records/{rid}           软删（级联子记录）

GET    /api/forms/{formId}/records/{rid}/children/{childFormId}  子记录列表
DELETE /api/forms/{formId}/records/{rid}/children/{childFormId}/{crid}  删子记录
```

### 12.3 Reference & 自省 API

```
GET    /api/forms/{formId}/records/lookup?keyword=&pageNum=1&pageSize=20
GET    /api/admin/db/tables                        列出用户表
GET    /api/admin/db/tables/{table}/columns        列出表的列
```

### 12.4 校验失败响应

```json
{
  "code": 40000,
  "message": "表单数据校验失败",
  "data": {
    "fieldErrors": [
      { "field": "customer_name", "code": "required", "message": "客户名称不能为空" }
    ],
    "formErrors": [
      { "formId": 101, "recordIndex": 0, "fieldErrors": [...] }
    ]
  }
}
```

### 12.5 新增 ErrorCode

```java
FORM_NOT_FOUND(53001, "表单不存在"),
FORM_FIELD_NOT_FOUND(53002, "表单字段不存在"),
FORM_DATA_NOT_FOUND(53003, "表单数据不存在"),
FORM_VALIDATION_FAILED(53004, "表单校验失败"),
FORM_DUPLICATE_BUSINESS_KEY(53005, "业务主键重复"),
FORM_RELATIONSHIP_BLOCKED(53006, "父子关系存在数据，无法删除"),
FORM_MAPPING_INVALID(53007, "字段映射配置无效"),
FORM_REFERENCE_NOT_FOUND(53008, "引用的记录不存在"),
FORM_FIELD_IN_USE(53009, "字段被引用，无法删除"),
```

---

## 13. 端到端 Trace

### 13.1 用户填表 → 写入

**场景**：订单（formId=100，mapped → `orders` 表）+ 2 个订单项（formId=101，unmapped → form_data）

```json
POST /api/forms/100/records
{
  "data": { "customer_name": "ACME", "total_amount": 999, "customer_ref": 42 },
  "children": [
    { "formId": 101, "data": { "product_sku": "X1", "quantity": 2 } },
    { "formId": 101, "data": { "product_sku": "X2", "quantity": 1 } }
  ]
}
```

执行：

```
1. SchemaService.getCurrent(100) → schema_id=200, version=3, fields, relationships
   → form_relationship: parent=100, child=101, child_link_field=order_id_ref, on_delete=CASCADE

2. ValidationEngine.validateForm 校验父
   → customer_name: required, minLength=2 ✓
   → total_amount: required, min=0 ✓
   → customer_ref: reference exists check
     → SELECT 1 FROM customers WHERE id = 42 → 存在 ✓

3. MappingEngine.buildInsert 父
   → target_table=orders
   → SQL: INSERT INTO orders (customer_name, total_amount, customer_ref) VALUES (?, ?, ?)
   → type=number, column=NUMERIC: NumberToStringConverter 不需要
   → type=reference, column=BIGINT: PassthroughConverter

4. JdbcTemplate.update → parentId = 12345

5. 遍历 children[0]:
   a. inject linking → {product_sku: "X1", quantity: 2, order_id_ref: 12345}
   b. 校验子
   c. SchemaService.getCurrent(101) → schema_id=201, fields
   d. target_table=NULL → 走 form_data
   e. JSONB: {product_sku: "X1", quantity: 2, order_id_ref: 12345}
   f. INSERT INTO form_data (form_id, data) VALUES (101, ?::jsonb)
   → childRecordId = 50001

6. children[1] 同上 → childRecordId = 50002

7. 响应: { id: 12345, childResults: [{formId:101, recordId:50001}, {formId:101, recordId:50002}] }
```

### 13.2 读取数据

```
GET /api/forms/100/records/12345

1. SchemaService.getCurrent(100) → schema_id=200, version=3
2. SELECT * FROM orders WHERE id = 12345 AND deleted = 0
3. MappingEngine.convertFromColumn: 把每列值转 display 类型
   → customer_name → string
   → total_amount → BigDecimal → number
   → customer_ref → BIGINT → reference（调用 FormReferenceEngine.lookup 拿 display）
4. FormDataService.listChildren(100, 12345, 101):
   → SELECT * FROM form_data WHERE form_id = 101 AND data->>'order_id_ref' = '12345' AND deleted = 0
5. 剔除 is_link_field=true 的字段
6. 响应: { id: 12345, formId: 100, formVersion: 3, data: {...}, children: [...] }
```

### 13.3 设计器改字段 → 新版本

```
PUT /api/forms/100/schema
{ fields: [... 新增 discount 字段 ...] }

1. 事务开始
2. 查 form_schema(formId=100, is_current=true) → schema_id=200, version=3
3. 插入新 form_schema: form_id=100, version=4, is_current=true → schema_id=201
4. 复制 form_field_def (10 字段) → 新行（schema_id=201, id=新雪花）
5. 应用新配置（添加 discount 字段）
6. 旧 schema_id=200 UPDATE is_current=false
7. 事务提交
8. 旧 form_data / 旧 user 表数据完全不动
9. 新提交按 schema_id=201 校验
```

---

## 14. 实现架构

### 14.1 包结构

```
com.safevalidator.form
├── schema/                  -- 元数据
│   ├── entity/              FormSchema, FormFieldDef, FormRelationship, FormBusinessKey
│   ├── mapper/              MyBatis mappers
│   ├── dto/                 请求/响应 DTO
│   ├── service/             FormSchemaService, FormFieldDefService, FormRelationshipService
│   └── controller/          FormController, FormSchemaController, FormRelationshipController
│
├── runtime/                 -- 运行时
│   ├── engine/              FormDataEngine, FormReferenceEngine, CascadeDeleteEngine
│   ├── service/             FormDataService
│   ├── dto/                 FormSubmitRequest, FormSubmitResult
│   └── controller/          FormDataController, FormReferenceController
│
├── mapping/                 -- 映射
│   ├── engine/              MappingEngine
│   ├── registry/            FieldTypeRegistry, TypeConverterRegistry, ColumnIntrospector
│   ├── type/                10 个 FieldType 实现
│   └── converter/           9 个 TypeConverter 实现
│
├── validation/              -- 校验
│   ├── engine/              ValidationEngine
│   ├── registry/            ValidationRuleRegistry
│   └── rule/                9 个 ValidationRule 实现
│
└── migration/               -- Flyway V3, V4 迁移脚本
    ├── V3__form_metadata.sql
    └── V4__form_business_key.sql
```

### 14.2 关键类签名

```java
// schema/
public interface FormSchemaService {
    Long createForm(CreateFormRequest req);
    FormSchemaDetail getCurrent(Long formId);
    Long publishNewVersion(Long formId, UpdateSchemaRequest req);
    List<SchemaVersionVO> listVersions(Long formId);
    SchemaDetail getVersion(Long formId, int version);
}

// mapping/
public interface MappingEngine {
    Object convertToColumn(FormFieldDef field, Object displayValue, Map<String, String> columnTypes);
    Object convertFromColumn(FormFieldDef field, Object columnValue, Map<String, String> columnTypes);
    BuiltSql buildInsert(String table, List<FormFieldDef> fields, Map<String, Object> values);
    BuiltSql buildSelect(String table, List<FormFieldDef> fields, Long recordId);
    BuiltSql buildDelete(String table, String linkingColumn, Object parentId);
}

public interface FieldTypeRegistry { FieldType get(String name); void register(FieldType t); }
public interface TypeConverterRegistry { TypeConverter find(String src, String tgt); void register(TypeConverter c); }
public interface ColumnIntrospector { List<ColumnInfo> listColumns(String tableName); List<String> listUserTables(); }

// validation/
public interface ValidationEngine {
    List<FieldError> validateField(FormFieldDef field, Object value);
    FormValidationResult validateForm(FormSubmitRequest req);
}

// runtime/
public interface FormDataService {
    FormSubmitResult submit(FormSubmitRequest req);
    FormRecord getById(Long formId, Long recordId);
    PageResult<FormRecord> page(Long formId, PageQuery query);
    void delete(Long formId, Long recordId);
    List<FormRecord> listChildren(Long formId, Long parentId, Long childFormId);
}

public interface FormReferenceEngine {
    PageResult<ReferenceOption> lookup(Long targetFormId, String keyword, PageQuery query);
}
```

---

## 15. 测试策略

**子项目 2 必须有测试**（form engine 是核心业务逻辑）：

- **单元测试**：`FieldType` / `ValidationRule` / `TypeConverter` / `ValidationEngine` / `MappingEngine` 各自独立
- **集成测试**：每个 service + in-memory Postgres（Testcontainers + postgres:16-alpine）
- **端到端测试**：`@SpringBootTest` + `MockMvc` / `TestRestTemplate`，覆盖完整 HTTP API

---

## 16. 与基础设施层的关系

### 16.1 复用

- **`com.safevalidator.common.api.Result<T>`** — 所有 API 响应
- **`com.safevalidator.common.api.PageQuery` / `PageResult<T>`** — 分页
- **`com.safevalidator.common.api.ErrorCode`** — 错误码，§12.5 新增 8 个
- **`com.safevalidator.common.exception.BizException` + `GlobalExceptionHandler`** — 异常处理
- **`com.safevalidator.common.security.SecurityUtils`** — 获取当前用户
- **`com.safevalidator.common.mybatis.MybatisAutoFillHandler`** — 自动填充 create_time 等
- **MyBatis-Plus** — 元数据 CRUD（form_schema 等）
- **JdbcTemplate** — 动态 SQL（mapped 表写入）

### 16.2 新增依赖

- **spring-boot-starter-jdbc**（form 模块）— 动态 SQL 用 JdbcTemplate，不用 MyBatis-Plus
- **postgresql JDBC 驱动**（已有）

---

## 17. 开放问题

1. **跨 schema version 读数据**：是否需要"按指定 version 读数据"？MVP 不做，统一按当前 schema 解释。后续可加 `?version=N` 参数。
2. **表单间数据迁移**：A form 的数据能否"转换"成 B form 的数据？MVP 不做。
3. **文件上传**：MVP 简化实现 — 存到本地磁盘 + 静态文件服务。未来可对接对象存储。
4. **乐观锁 / 并发提交**：MVP 不做，最后写入的获胜。
5. **数据权限**（行级 / 字段级）：明确延后。

---

## 18. 决策汇总

| 决策点 | 选择 |
|---|---|
| 数据存储 | mapped → 用户预定义表；unmapped → form_data（JSONB） |
| 类型映射 | 灵活，display type ↔ storage type 通过 TypeConverter |
| 类型扩展 | `FieldType` 接口 + Spring registry，10 个内置 |
| 校验规则扩展 | `ValidationRule` 接口 + Spring registry，9 个内置 |
| 业务主键 | 复合主键表 `form_business_key` + 查重 upsert |
| reference 字段 | config 存 targetFormId + displayField + storageAs |
| 父子关系 | 独立表 `form_relationship`，不在 field 定义里 |
| linking 字段 | UI 隐藏 + engine 自动注入 + required |
| Schema 版本 | immutable 多版本；data 按当前版本解释（schema-on-read） |
| 级联删除 | 1:N 默认 CASCADE；1:1 默认 RESTRICT |
| 父子提交 | 单请求 + 事务原子 |
| 权限 | 延后（明确） |
| 测试 | 必须有（与基础设施层不同） |
