# Part 0: Backend Extensions (V5 + Sections API)

**Phase:** 0 of 6
**Tasks:** 0.1 – 0.6
**End state:** `form_section` table exists; 4 sections APIs work; `CreateFieldRequest` accepts `sectionId`; `publishNewVersion` copies sections.

**Working directory:** `/home/cris/dev/safeValidator/backend/`

**No Lombok.** MyBatis-Plus for metadata tables. JdbcTemplate not needed here.

---

## Task 0.1: V5 migration — form_section + form_field_def.section_id

**Files:**
- Create: `safe-validator-start/src/main/resources/db/migration/V5__form_section.sql`

- [ ] **Step 1: Create V5 migration**

```sql
-- =====================================================
-- V5: Form sections (visual grouping, not data structure)
-- =====================================================

-- Section: a visual group on the canvas, doesn't affect form data
CREATE TABLE form_section (
    id            BIGINT       PRIMARY KEY,
    schema_id     BIGINT       NOT NULL,
    name          VARCHAR(128) NOT NULL,
    description   TEXT,
    sort_order    INT          NOT NULL DEFAULT 0,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_form_section_schema ON form_section(schema_id) WHERE deleted = 0;

-- Add section_id foreign key to form_field_def
ALTER TABLE form_field_def
    ADD COLUMN section_id BIGINT NULL;

-- No FK constraint; app-level ensures section exists (sections can be deleted with SET NULL semantics)
```

- [ ] **Step 2: Run migration against test DB**

```bash
docker exec -it postgres-dev psql -U postgres -c "DROP DATABASE IF EXISTS sv_v5_test;"
docker exec -it postgres-dev psql -U postgres -c "CREATE DATABASE sv_v5_test;"

cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-start flyway:migrate \
    -Dflyway.url=jdbc:postgresql://localhost:5432/sv_v5_test \
    -Dflyway.user=postgres \
    -Dflyway.password=FitechDev_2026 \
    -Dflyway.locations=filesystem:/home/cris/dev/safeValidator/backend/safe-validator-start/src/main/resources/db/migration

# Verify
docker exec postgres-dev psql -U postgres -d sv_v5_test -c "\d form_section"
docker exec postgres-dev psql -U postgres -d sv_v5_test -c "\d form_field_def" | grep section_id

docker exec postgres-dev psql -U postgres -c "DROP DATABASE sv_v5_test;"
```

Expected: 5 migrations applied, `form_section` table exists, `form_field_def.section_id` column exists.

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
git add safe-validator-start/src/main/resources/db/migration/V5__form_section.sql
git commit -m "feat(db): add V5 migration for form_section + form_field_def.section_id"
```

---

## Task 0.2: FormSection entity + mapper

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/entity/FormSection.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/mapper/FormSectionMapper.java`
- Create: `safe-validator-form/src/main/resources/mapper/FormSectionMapper.xml`

- [ ] **Step 1: Create FormSection entity**

```java
package com.safevalidator.form.schema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("form_section")
public class FormSection {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long schemaId;
    private String name;
    private String description;
    private Integer sortOrder;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Long createBy;
    private Long updateBy;
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSchemaId() { return schemaId; }
    public void setSchemaId(Long schemaId) { this.schemaId = schemaId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
    public Long getCreateBy() { return createBy; }
    public void setCreateBy(Long createBy) { this.createBy = createBy; }
    public Long getUpdateBy() { return updateBy; }
    public void setUpdateBy(Long updateBy) { this.updateBy = updateBy; }
    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }
}
```

- [ ] **Step 2: Create FormSectionMapper**

```java
package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormSection;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormSectionMapper extends BaseMapper<FormSection> {
    List<FormSection> selectBySchemaId(@Param("schemaId") Long schemaId);
}
```

- [ ] **Step 3: Create FormSectionMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.form.schema.mapper.FormSectionMapper">

    <resultMap id="sectionMap" type="com.safevalidator.form.schema.entity.FormSection">
        <id property="id" column="id"/>
        <result property="schemaId" column="schema_id"/>
        <result property="name" column="name"/>
        <result property="description" column="description"/>
        <result property="sortOrder" column="sort_order"/>
        <result property="createTime" column="create_time"/>
        <result property="updateTime" column="update_time"/>
        <result property="createBy" column="create_by"/>
        <result property="updateBy" column="update_by"/>
        <result property="deleted" column="deleted"/>
    </resultMap>

    <select id="selectBySchemaId" resultMap="sectionMap">
        SELECT * FROM form_section
        WHERE schema_id = #{schemaId} AND deleted = 0
        ORDER BY sort_order, id
    </select>
</mapper>
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
git add safe-validator-form
git commit -m "feat(form): add FormSection entity, mapper, MyBatis XML"
```

---

## Task 0.3: Section DTOs + FormFieldDef.sectionId

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/SectionVO.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/CreateSectionRequest.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/UpdateSectionRequest.java`
- Modify: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/CreateFieldRequest.java` (add sectionId)
- Modify: `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/FormFieldDefVO.java` (add sectionId)

- [ ] **Step 1: Create SectionVO**

```java
package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;

public record SectionVO(
        Long id,
        Long schemaId,
        String name,
        String description,
        Integer sortOrder,
        LocalDateTime createTime,
        LocalDateTime updateTime
) {}
```

- [ ] **Step 2: Create CreateSectionRequest**

```java
package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSectionRequest(
        @NotBlank @Size(max = 128) String name,
        @Size(max = 512) String description,
        Integer sortOrder
) {}
```

- [ ] **Step 3: Create UpdateSectionRequest**

```java
package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.Size;

public record UpdateSectionRequest(
        @Size(max = 128) String name,
        @Size(max = 512) String description,
        Integer sortOrder
) {}
```

- [ ] **Step 4: Update CreateFieldRequest — add `sectionId`**

Find and modify `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/CreateFieldRequest.java`. Add `Long sectionId` to the record (use `@Nullable` semantics — no validation annotation, can be null):

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
        @Size(max = 128) String targetColumn,
        Long sectionId                  // <-- NEW: optional, null = no section
) {}
```

- [ ] **Step 5: Update FormFieldDefVO — add `sectionId`**

Find and modify `safe-validator-form/src/main/java/com/safevalidator/form/schema/dto/FormFieldDefVO.java`. Add `Long sectionId` to the record (before `isLinkField`):

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
        Long sectionId,             // <-- NEW
        Boolean isLinkField,
        LocalDateTime createTime,
        LocalDateTime updateTime
) {}
```

- [ ] **Step 6: Update FormFieldDef entity — add sectionId field**

Modify `safe-validator-form/src/main/java/com/safevalidator/form/schema/entity/FormFieldDef.java`. Add `sectionId` field (use Long, nullable) and getter/setter:

```java
private Long sectionId;

public Long getSectionId() { return sectionId; }
public void setSectionId(Long sectionId) { this.sectionId = sectionId; }
```

- [ ] **Step 7: Update FormFieldDefMapper.xml to include section_id**

In `FormFieldDefMapper.xml`, add `<result property="sectionId" column="section_id"/>` to the fieldMap result map. Also update the SELECT to include section_id.

- [ ] **Step 8: Update FormFieldDef service to handle sectionId**

In `FormFieldDefService.addField` and `FormFieldDefService.updateField`, when creating/updating the entity, set `def.setSectionId(req.sectionId())` from the request.

- [ ] **Step 9: Update FormSchemaService toFieldVO — pass sectionId**

In `FormSchemaService.toFieldVO`, add `f.getSectionId()` to the record construction.

- [ ] **Step 10: Update FormDataService.toEntity — pass sectionId**

In `FormDataService.toEntity`, add `f.setSectionId(v.getSectionId())` to the entity construction.

- [ ] **Step 11: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
git add safe-validator-form
git commit -m "feat(form): add section DTOs + sectionId on field DTOs/entity"
```

---

## Task 0.4: FormSectionService

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/service/FormSectionService.java`

- [ ] **Step 1: Create FormSectionService**

```java
package com.safevalidator.form.schema.service;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.CreateSectionRequest;
import com.safevalidator.form.schema.dto.SectionVO;
import com.safevalidator.form.schema.dto.UpdateSectionRequest;
import com.safevalidator.form.schema.entity.FormSection;
import com.safevalidator.form.schema.mapper.FormSectionMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FormSectionService {

    private final FormSectionMapper sectionMapper;

    public FormSectionService(FormSectionMapper sectionMapper) {
        this.sectionMapper = sectionMapper;
    }

    public List<SectionVO> listByFormId(Long formId) {
        var schema = ((com.safevalidator.form.schema.service.FormSchemaService) com.safevalidator.common.util.SpringContextHolder.getBean(FormSchemaService.class))
                .getCurrentSchema(formId);
        return sectionMapper.selectBySchemaId(schema.getId()).stream()
                .map(this::toVO).toList();
    }

    public SectionVO getById(Long sectionId) {
        FormSection s = sectionMapper.selectById(sectionId);
        if (s == null) throw new BizException(ErrorCode.SECTION_NOT_FOUND);
        return toVO(s);
    }

    public Long create(Long formId, CreateSectionRequest req) {
        var schemaService = (com.safevalidator.form.schema.service.FormSchemaService) com.safevalidator.common.util.SpringContextHolder.getBean(FormSchemaService.class);
        var schema = schemaService.getCurrentSchema(formId);
        FormSection section = new FormSection();
        section.setSchemaId(schema.getId());
        section.setName(req.name());
        section.setDescription(req.description());
        section.setSortOrder(req.sortOrder() != null ? req.sortOrder() : nextOrder(schema.getId()));
        sectionMapper.insert(section);
        return section.getId();
    }

    public void update(Long formId, Long sectionId, UpdateSectionRequest req) {
        FormSection s = sectionMapper.selectById(sectionId);
        if (s == null) throw new BizException(ErrorCode.SECTION_NOT_FOUND);
        if (req.name() != null) s.setName(req.name());
        if (req.description() != null) s.setDescription(req.description());
        if (req.sortOrder() != null) s.setSortOrder(req.sortOrder());
        sectionMapper.updateById(s);
    }

    public void delete(Long formId, Long sectionId) {
        FormSection s = sectionMapper.selectById(sectionId);
        if (s == null) return;
        sectionMapper.deleteById(sectionId);
    }

    private int nextOrder(Long schemaId) {
        return sectionMapper.selectBySchemaId(schemaId).size();
    }

    public SectionVO toVO(FormSection s) {
        return new SectionVO(s.getId(), s.getSchemaId(), s.getName(),
                s.getDescription(), s.getSortOrder(),
                s.getCreateTime(), s.getUpdateTime());
    }
}
```

**Note on the `SpringContextHolder` hack**: This is a workaround to avoid circular bean injection. Alternatively, inject `FormSchemaService` directly via constructor — but that creates a circular dependency. The clean fix: extract a method `getCurrentSchemaId(formId)` in `FormSchemaService` that FormSectionService calls. For MVP, the SpringContextHolder pattern is acceptable.

Actually, simpler: just inject `FormSchemaService` in constructor. FormSectionService depends on FormSchemaService which is fine. Let me fix the implementation:

- [ ] **Step 1 (revised): Replace FormSectionService with constructor injection**

```java
package com.safevalidator.form.schema.service;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.CreateSectionRequest;
import com.safevalidator.form.schema.dto.SectionVO;
import com.safevalidator.form.schema.dto.UpdateSectionRequest;
import com.safevalidator.form.schema.entity.FormSection;
import com.safevalidator.form.schema.mapper.FormSectionMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FormSectionService {

    private final FormSectionMapper sectionMapper;
    private final FormSchemaService schemaService;

    public FormSectionService(FormSectionMapper sectionMapper, FormSchemaService schemaService) {
        this.sectionMapper = sectionMapper;
        this.schemaService = schemaService;
    }

    public List<SectionVO> listByFormId(Long formId) {
        var schema = schemaService.getCurrentSchema(formId);
        return sectionMapper.selectBySchemaId(schema.getId()).stream()
                .map(this::toVO).toList();
    }

    public Long create(Long formId, CreateSectionRequest req) {
        var schema = schemaService.getCurrentSchema(formId);
        FormSection section = new FormSection();
        section.setSchemaId(schema.getId());
        section.setName(req.name());
        section.setDescription(req.description());
        section.setSortOrder(req.sortOrder() != null ? req.sortOrder() : nextOrder(schema.getId()));
        sectionMapper.insert(section);
        return section.getId();
    }

    public void update(Long formId, Long sectionId, UpdateSectionRequest req) {
        FormSection s = sectionMapper.selectById(sectionId);
        if (s == null) throw new BizException(ErrorCode.SECTION_NOT_FOUND);
        if (req.name() != null) s.setName(req.name());
        if (req.description() != null) s.setDescription(req.description());
        if (req.sortOrder() != null) s.setSortOrder(req.sortOrder());
        sectionMapper.updateById(s);
    }

    public void delete(Long formId, Long sectionId) {
        sectionMapper.deleteById(sectionId);
    }

    private int nextOrder(Long schemaId) {
        return sectionMapper.selectBySchemaId(schemaId).size();
    }

    public SectionVO toVO(FormSection s) {
        return new SectionVO(s.getId(), s.getSchemaId(), s.getName(),
                s.getDescription(), s.getSortOrder(),
                s.getCreateTime(), s.getUpdateTime());
    }
}
```

- [ ] **Step 2: Add SECTION_NOT_FOUND error code**

Modify `safe-validator-common/src/main/java/com/safevalidator/common/api/ErrorCode.java`. Add before SYSTEM_ERROR:

```java
SECTION_NOT_FOUND(53010, "分组不存在"),
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
git add safe-validator-form safe-validator-common
git commit -m "feat(form): add FormSectionService + SECTION_NOT_FOUND error"
```

---

## Task 0.5: SectionController + update FormController + FormSchemaService

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/controller/FormSectionController.java`
- Modify: `safe-validator-form/src/main/java/com/safevalidator/form/schema/service/FormSchemaService.java` (copy sections in publishNewVersion, return sections in detail)

- [ ] **Step 1: Create FormSectionController**

```java
package com.safevalidator.form.schema.controller;

import com.safevalidator.common.api.Result;
import com.safevalidator.form.schema.dto.CreateSectionRequest;
import com.safevalidator.form.schema.dto.SectionVO;
import com.safevalidator.form.schema.dto.UpdateSectionRequest;
import com.safevalidator.form.schema.service.FormSectionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/forms/{formId}/sections")
public class FormSectionController {

    private final FormSectionService sectionService;

    public FormSectionController(FormSectionService sectionService) {
        this.sectionService = sectionService;
    }

    @GetMapping
    public Result<List<SectionVO>> list(@PathVariable Long formId) {
        return Result.ok(sectionService.listByFormId(formId));
    }

    @PostMapping
    public Result<Long> create(@PathVariable Long formId, @Valid @RequestBody CreateSectionRequest req) {
        return Result.ok(sectionService.create(formId, req));
    }

    @PutMapping("/{sectionId}")
    public Result<Void> update(@PathVariable Long formId, @PathVariable Long sectionId,
                                @Valid @RequestBody UpdateSectionRequest req) {
        sectionService.update(formId, sectionId, req);
        return Result.ok();
    }

    @DeleteMapping("/{sectionId}")
    public Result<Void> delete(@PathVariable Long formId, @PathVariable Long sectionId) {
        sectionService.delete(formId, sectionId);
        return Result.ok();
    }
}
```

- [ ] **Step 2: Update FormSchemaService — include sections in detail + publishNewVersion**

Modify `FormSchemaService.java`:

(a) Inject `FormSectionMapper sectionMapper` in constructor.

(b) Update `toDetailVO` to also load sections:

```java
public SchemaDetailVO toDetailVO(FormSchema s) {
    List<FormFieldDefVO> fields = fieldMapper.selectBySchemaId(s.getId()).stream()
            .map(this::toFieldVO).toList();
    List<RelationshipVO> rels = relMapper.selectBySchemaId(s.getId()).stream()
            .map(this::toRelVO).toList();
    List<SectionVO> sections = sectionMapper.selectBySchemaId(s.getId()).stream()
            .map(sec -> sectionService.toVO(sec)).toList();
    return new SchemaDetailVO(
            s.getFormId(), s.getVersion(), s.getId(),
            s.getName(), s.getDescription(), s.getTargetTable(),
            s.getIsCurrent(), s.getCreateTime(),
            fields, rels, sections);   // <-- new sections param
}
```

(c) Update `SchemaDetailVO` record to include sections:

```java
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
        List<RelationshipVO> relationships,
        List<SectionVO> sections          // <-- NEW
) {}
```

(d) In `publishNewVersion`, after creating new schema and copying fields/relationships, also copy sections:

```java
// 4.5. copy sections
List<FormSection> oldSections = sectionMapper.selectBySchemaId(current.getId());
Map<Long, Long> sectionIdMap = new HashMap<>();   // old section id -> new section id
for (FormSection old : oldSections) {
    FormSection newSec = new FormSection();
    newSec.setSchemaId(newSchema.getId());
    newSec.setName(old.getName());
    newSec.setDescription(old.getDescription());
    newSec.setSortOrder(old.getSortOrder());
    sectionMapper.insert(newSec);
    sectionIdMap.put(old.getId(), newSec.getId());
}
```

And also delete old sections:

```java
// (in the cleanup loop, before relations cleanup)
for (FormSection old : sectionMapper.selectBySchemaId(current.getId())) {
    sectionMapper.deleteById(old.getId());
}
```

(e) Add new section handling at the END of publishNewVersion (if `req.sections` is present, create new ones; in future this might replace the copy step):

```java
// 5.5. apply new sections (if any)
if (req.sections() != null) {
    for (CreateSectionRequest sec : req.sections()) {
        FormSection newSec = new FormSection();
        newSec.setSchemaId(newSchema.getId());
        newSec.setName(sec.name());
        newSec.setDescription(sec.description());
        newSec.setSortOrder(sec.sortOrder() != null ? sec.sortOrder() : 0);
        sectionMapper.insert(newSec);
    }
}
```

(f) Add `sections` field to `UpdateSchemaRequest`:

```java
public record UpdateSchemaRequest(
        String name,
        String description,
        List<CreateFieldRequest> fields,
        List<CreateRelationshipRequest> relationships,
        List<CreateSectionRequest> sections          // <-- NEW
) {}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
git add safe-validator-form
git commit -m "feat(form): add FormSectionController + integrate sections in FormSchemaService"
```

---

## Task 0.6: Phase 0 verification

- [ ] **Step 1: Run existing E2E test to ensure no regression**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am test -Dtest='E2ESmokeTest'
```

Expected: passes (47 tests still pass).

- [ ] **Step 2: Full backend build**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am clean compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit final state**

```bash
cd backend
git status
git add -A
git commit -m "chore: phase 0 (backend extensions) verified" --allow-empty
```

**Phase 0 complete.** Proceed to [Part 1: Frontend Infrastructure](2026-06-26-form-designer-part1-frontend-infra.md).
