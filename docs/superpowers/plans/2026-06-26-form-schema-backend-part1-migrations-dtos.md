# Part 1: Migrations, DTOs, ErrorCodes

**Phase:** 1 of 7
**Tasks:** 1.1 – 1.7
**End state:** Flyway V3+V4 apply; form-related DTOs and ErrorCodes exist.

---

## Task 1.1: Flyway V3 — form_schema, form_field_def, form_relationship

**Files:**
- Create: `safe-validator-start/src/main/resources/db/migration/V3__form_metadata.sql`

- [ ] **Step 1: Write the V3 migration**

```sql
-- =====================================================
-- V3: Form engine metadata tables
-- =====================================================

-- Schema metadata (immutable versions)
CREATE TABLE form_schema (
    id            BIGINT       PRIMARY KEY,
    form_id       BIGINT       NOT NULL,
    version       INT          NOT NULL,
    name          VARCHAR(128) NOT NULL,
    description   TEXT,
    status        SMALLINT     NOT NULL DEFAULT 1,
    target_table  VARCHAR(128),
    is_current    BOOLEAN      NOT NULL DEFAULT false,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_form_schema_form_version ON form_schema(form_id, version) WHERE deleted = 0;
CREATE INDEX idx_form_schema_current ON form_schema(form_id) WHERE is_current = true AND deleted = 0;

-- Field definitions (belong to a specific schema version)
CREATE TABLE form_field_def (
    id            BIGINT       PRIMARY KEY,
    schema_id     BIGINT       NOT NULL,
    code          VARCHAR(64)  NOT NULL,
    name          VARCHAR(128) NOT NULL,
    type          VARCHAR(32)  NOT NULL,
    required      BOOLEAN      NOT NULL DEFAULT false,
    default_value TEXT,
    sort_order    INT          NOT NULL DEFAULT 0,
    config        JSONB,
    validation    JSONB,
    target_column VARCHAR(128),
    is_link_field BOOLEAN      NOT NULL DEFAULT false,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_field_def_schema ON form_field_def(schema_id) WHERE deleted = 0;
CREATE UNIQUE INDEX uk_form_field_def_code ON form_field_def(schema_id, code) WHERE deleted = 0;

-- Parent-child relationships
CREATE TABLE form_relationship (
    id                BIGINT       PRIMARY KEY,
    schema_id         BIGINT       NOT NULL,
    parent_form_id    BIGINT       NOT NULL,
    child_form_id     BIGINT       NOT NULL,
    relation_type     VARCHAR(16)  NOT NULL,
    parent_link_field VARCHAR(64),
    child_link_field  VARCHAR(64)  NOT NULL,
    on_delete         VARCHAR(16)  NOT NULL DEFAULT 'CASCADE',
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

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
git add safe-validator-start/src/main/resources/db/migration/V3__form_metadata.sql
git commit -m "feat(db): add V3 migration for form engine metadata tables"
```

---

## Task 1.2: Flyway V4 — form_business_key, form_data

**Files:**
- Create: `safe-validator-start/src/main/resources/db/migration/V4__form_data_and_business_key.sql`

- [ ] **Step 1: Write the V4 migration**

```sql
-- =====================================================
-- V4: Form data + business key tables
-- =====================================================

-- Business key (composite key support for upsert)
CREATE TABLE form_business_key (
    id          BIGINT  PRIMARY KEY,
    form_id     BIGINT  NOT NULL,
    field_id    BIGINT  NOT NULL,
    key_order   INT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted     SMALLINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_form_business_key_field ON form_business_key(form_id, field_id) WHERE deleted = 0;

-- Universal form_data (only used for unmapped forms)
CREATE TABLE form_data (
    id          BIGINT       PRIMARY KEY,
    form_id     BIGINT       NOT NULL,
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

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
git add safe-validator-start/src/main/resources/db/migration/V4__form_data_and_business_key.sql
git commit -m "feat(db): add V4 migration for form data and business key"
```

---

## Task 1.3: Run migrations against test DB

- [ ] **Step 1: Create test database**

```bash
docker exec -it postgres-dev psql -U postgres -c "DROP DATABASE IF EXISTS sv_form_test;"
docker exec -it postgres-dev psql -U postgres -c "CREATE DATABASE sv_form_test;"
```

- [ ] **Step 2: Run migrations**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-start flyway:migrate \
    -Dflyway.url=jdbc:postgresql://localhost:5432/sv_form_test \
    -Dflyway.user=postgres \
    -Dflyway.password=FitechDev_2026 \
    -Dflyway.locations=filesystem:/home/cris/dev/safeValidator/backend/safe-validator-start/src/main/resources/db/migration
```

Expected: 4 migrations applied (V1, V2, V3, V4).

- [ ] **Step 3: Verify tables**

```bash
docker exec postgres-dev psql -U postgres -d sv_form_test -c "\dt"
```

Expected: 12 tables (8 sys_* + 4 form_*).

- [ ] **Step 4: Cleanup**

```bash
docker exec postgres-dev psql -U postgres -c "DROP DATABASE sv_form_test;"
```

---

## Task 1.4: Add form-related ErrorCodes

**Files:**
- Modify: `safe-validator-common/src/main/java/com/safevalidator/common/api/ErrorCode.java`

- [ ] **Step 1: Add 9 new error codes**

Add these entries to the `ErrorCode` enum (alphabetically near the end, before `SYSTEM_ERROR`):

```java
FORM_NOT_FOUND(53001, "表单不存在"),
FORM_FIELD_NOT_FOUND(53002, "表单字段不存在"),
FORM_DATA_NOT_FOUND(53003, "表单数据不存在"),
FORM_VALIDATION_FAILED(53004, "表单校验失败"),
FORM_DUPLICATE_BUSINESS_KEY(53005, "业务主键重复"),
FORM_RELATIONSHIP_BLOCKED(53006, "存在子数据，无法删除"),
FORM_MAPPING_INVALID(53007, "字段映射配置无效"),
FORM_REFERENCE_NOT_FOUND(53008, "引用的记录不存在"),
FORM_FIELD_IN_USE(53009, "字段被引用，无法删除"),
```

- [ ] **Step 2: Verify compile**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile -q
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add safe-validator-common
git commit -m "feat(common): add 9 form-related error codes"
```

---

## Task 1.5: Create base DTOs for form engine

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/CreateFormRequest.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/FormSchemaVO.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/CreateFieldRequest.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/UpdateFieldRequest.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/FormFieldDefVO.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/CreateRelationshipRequest.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/RelationshipVO.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/UpdateSchemaRequest.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/SchemaDetailVO.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/SchemaVersionVO.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/FieldError.java`

- [ ] **Step 1: Create FieldError (used by validation)**

```java
package com.safevalidator.form.schema.dto;

public record FieldError(String field, String code, String message) {}
```

- [ ] **Step 2: Create CreateFormRequest**

```java
package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFormRequest(
        @NotBlank @Size(max = 128) String name,
        @Size(max = 64) String code,
        String description
) {}
```

- [ ] **Step 3: Create FormSchemaVO**

```java
package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;

public record FormSchemaVO(
        Long id,
        Long formId,
        Integer version,
        String name,
        String description,
        Integer status,
        String targetTable,
        Boolean isCurrent,
        LocalDateTime createTime,
        LocalDateTime updateTime
) {}
```

- [ ] **Step 5: Create CreateFieldRequest**

```java
package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record CreateFieldRequest(
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 128) String name,
        @NotBlank @Size(max = 32) String type,
        Boolean required,
        String defaultValue,
        Integer sortOrder,
        Map<String, Object> config,
        Map<String, Object> validation,
        @Size(max = 128) String targetColumn
) {}
```

- [ ] **Step 6: Create UpdateFieldRequest**

```java
package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.Size;

import java.util.Map;

public record UpdateFieldRequest(
        @Size(max = 128) String name,
        String type,
        Boolean required,
        String defaultValue,
        Integer sortOrder,
        Map<String, Object> config,
        Map<String, Object> validation,
        @Size(max = 128) String targetColumn
) {}
```

- [ ] **Step 7: Create FormFieldDefVO**

```java
package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record FormFieldDefVO(
        Long id,
        Long schemaId,
        String code,
        String name,
        String type,
        Boolean required,
        String defaultValue,
        Integer sortOrder,
        Map<String, Object> config,
        Map<String, Object> validation,
        String targetColumn,
        Boolean isLinkField,
        LocalDateTime createTime,
        LocalDateTime updateTime
) {}
```

- [ ] **Step 8: Create CreateRelationshipRequest**

```java
package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRelationshipRequest(
        @NotNull Long parentFormId,
        @NotNull Long childFormId,
        @NotBlank String relationType,        // ONE_TO_ONE | ONE_TO_MANY
        String parentLinkField,
        @NotBlank String childLinkField,
        String onDelete                      // CASCADE | SET_NULL | RESTRICT (default CASCADE)
) {}
```

- [ ] **Step 9: Create RelationshipVO**

```java
package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;

public record RelationshipVO(
        Long id,
        Long schemaId,
        Long parentFormId,
        Long childFormId,
        String relationType,
        String parentLinkField,
        String childLinkField,
        String onDelete,
        LocalDateTime createTime
) {}
```

- [ ] **Step 10: Create UpdateSchemaRequest (publish new version)**

```java
package com.safevalidator.form.schema.dto;

import java.util.List;

public record UpdateSchemaRequest(
        String name,
        String description,
        List<CreateFieldRequest> fields,
        List<CreateRelationshipRequest> relationships
) {}
```

- [ ] **Step 11: Create SchemaDetailVO**

```java
package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SchemaDetailVO(
        Long formId,
        Integer version,
        Long schemaId,
        String name,
        String description,
        String targetTable,
        Boolean isCurrent,
        LocalDateTime createTime,
        List<FormFieldDefVO> fields,
        List<RelationshipVO> relationships
) {}
```

- [ ] **Step 12: Create SchemaVersionVO**

```java
package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;

public record SchemaVersionVO(
        Long schemaId,
        Long formId,
        Integer version,
        Boolean isCurrent,
        String name,
        LocalDateTime createTime
) {}
```

- [ ] **Step 13: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add schema package DTOs"
```

---

## Task 1.6: Create runtime DTOs

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/runtime/dto/FormSubmitRequest.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/runtime/dto/FormSubmitResult.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/runtime/dto/FormRecord.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/runtime/dto/ChildSubmit.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/runtime/dto/FormValidationResult.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/runtime/dto/ReferenceOption.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/runtime/dto/ChildValidationResult.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/dto/ColumnInfo.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/dto/BuiltSql.java`

- [ ] **Step 1: Create FormSubmitRequest**

```java
package com.safevalidator.form.runtime.dto;

import java.util.List;
import java.util.Map;

public record FormSubmitRequest(
        Long formId,
        Map<String, Object> data,
        List<ChildSubmit> children
) {}
```

- [ ] **Step 2: Create ChildSubmit**

```java
package com.safevalidator.form.runtime.dto;

import java.util.List;
import java.util.Map;

public record ChildSubmit(
        Long formId,
        Map<String, Object> data,
        List<ChildSubmit> children      // recursive — supports deep nesting
) {}
```

- [ ] **Step 3: Create FormSubmitResult**

```java
package com.safevalidator.form.runtime.dto;

import java.util.List;

public record FormSubmitResult(
        Long id,
        Long formId,
        Integer formVersion,
        List<ChildSubmitResult> childResults
) {}
```

- [ ] **Step 4: Create ChildSubmitResult (package-private helper)**

```java
package com.safevalidator.form.runtime.dto;

public record ChildSubmitResult(Long formId, Long recordId) {}
```

- [ ] **Step 5: Create FormRecord (read response)**

```java
package com.safevalidator.form.runtime.dto;

import java.util.List;
import java.util.Map;

public record FormRecord(
        Long id,
        Long formId,
        Integer formVersion,
        Map<String, Object> data,
        List<FormRecord> children
) {}
```

- [ ] **Step 6: Create FormValidationResult**

```java
package com.safevalidator.form.runtime.dto;

import com.safevalidator.form.schema.dto.FieldError;

import java.util.List;

public record FormValidationResult(
        List<FieldError> fieldErrors,
        List<ChildValidationResult> formErrors
) {
    public boolean isOk() { return fieldErrors.isEmpty() && formErrors.isEmpty(); }
}
```

- [ ] **Step 7: Create ChildValidationResult**

```java
package com.safevalidator.form.runtime.dto;

import com.safevalidator.form.schema.dto.FieldError;

import java.util.List;

public record ChildValidationResult(
        Long formId,
        Integer recordIndex,
        List<FieldError> fieldErrors
) {}
```

- [ ] **Step 8: Create ReferenceOption**

```java
package com.safevalidator.form.runtime.dto;

public record ReferenceOption(Long id, String display) {}
```

- [ ] **Step 9: Create ColumnInfo (mapping package)**

```java
package com.safevalidator.form.mapping.dto;

public record ColumnInfo(
        String name,
        int jdbcType,
        String typeName,        // "varchar", "int4", "numeric", "date", "jsonb", "bool"...
        boolean nullable,
        Integer size
) {}
```

- [ ] **Step 10: Create BuiltSql (helper for dynamic SQL)**

```java
package com.safevalidator.form.mapping.dto;

import java.util.List;

public record BuiltSql(String sql, List<Object> params) {}
```

- [ ] **Step 11: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add runtime and mapping DTOs"
```

---

## Task 1.7: Phase 1 verification

- [ ] **Step 1: Confirm full backend builds**

```bash
cd /home/cris/dev/safeValidator/backend
mvn clean compile
```

Expected: BUILD SUCCESS for all 4 modules.

- [ ] **Step 2: Count files in form module**

```bash
find safe-validator-form/src -name "*.java" | wc -l
```

Expected: ~15 files (4 package-info + 10 DTOs + 1 FieldError).

- [ ] **Step 3: Commit any final fixes**

```bash
cd backend
git status
# If any uncommitted:
git add -A && git commit -m "chore: phase 1 verified" --allow-empty
```

**Phase 1 complete.** Proceed to [Part 2: Mapping — Registries + 10 Field Types](2026-06-26-form-schema-backend-part2-mapping-types.md).
