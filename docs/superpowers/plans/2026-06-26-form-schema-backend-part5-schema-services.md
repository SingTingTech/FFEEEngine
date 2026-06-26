# Part 5: Schema Entities, Mappers, Services

**Phase:** 5 of 7
**Tasks:** 5.1 – 5.5
**End state:** All schema CRUD APIs work. Publishing a new version creates immutable history. Relationships and business keys are managed.

**Test approach:** Service layer uses in-memory verification (verify in-memory state after calls). Full integration test with Testcontainers happens in Phase 7 final smoke.

---

## Task 5.1: Schema entities

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/entity/FormSchema.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/entity/FormFieldDef.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/entity/FormRelationship.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/entity/FormBusinessKey.java`

- [ ] **Step 1: Create FormSchema entity**

```java
package com.safevalidator.form.schema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("form_schema")
public class FormSchema {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long formId;
    private Integer version;
    private String name;
    private String description;
    private Integer status;
    private String targetTable;
    private Boolean isCurrent;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Long createBy;
    private Long updateBy;
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFormId() { return formId; }
    public void setFormId(Long formId) { this.formId = formId; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public String getTargetTable() { return targetTable; }
    public void setTargetTable(String targetTable) { this.targetTable = targetTable; }
    public Boolean getIsCurrent() { return isCurrent; }
    public void setIsCurrent(Boolean isCurrent) { this.isCurrent = isCurrent; }
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

- [ ] **Step 2: Create FormFieldDef entity**

```java
package com.safevalidator.form.schema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("form_field_def")
public class FormFieldDef {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long schemaId;
    private String code;
    private String name;
    private String type;
    private Boolean required;
    private String defaultValue;
    private Integer sortOrder;
    /** config stored as JSON string */
    private String config;
    /** validation stored as JSON string */
    private String validation;
    private String targetColumn;
    private Boolean isLinkField;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Long createBy;
    private Long updateBy;
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSchemaId() { return schemaId; }
    public void setSchemaId(Long schemaId) { this.schemaId = schemaId; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
    public String getDefaultValue() { return defaultValue; }
    public void setDefaultValue(String defaultValue) { this.defaultValue = defaultValue; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public String getConfig() { return config; }
    public void setConfig(String config) { this.config = config; }
    public String getValidation() { return validation; }
    public void setValidation(String validation) { this.validation = validation; }
    public String getTargetColumn() { return targetColumn; }
    public void setTargetColumn(String targetColumn) { this.targetColumn = targetColumn; }
    public Boolean getIsLinkField() { return isLinkField; }
    public void setIsLinkField(Boolean isLinkField) { this.isLinkField = isLinkField; }
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

- [ ] **Step 3: Create FormRelationship entity**

```java
package com.safevalidator.form.schema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("form_relationship")
public class FormRelationship {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long schemaId;
    private Long parentFormId;
    private Long childFormId;
    private String relationType;
    private String parentLinkField;
    private String childLinkField;
    private String onDelete;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Long createBy;
    private Long updateBy;
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSchemaId() { return schemaId; }
    public void setSchemaId(Long schemaId) { this.schemaId = schemaId; }
    public Long getParentFormId() { return parentFormId; }
    public void setParentFormId(Long parentFormId) { this.parentFormId = parentFormId; }
    public Long getChildFormId() { return childFormId; }
    public void setChildFormId(Long childFormId) { this.childFormId = childFormId; }
    public String getRelationType() { return relationType; }
    public void setRelationType(String relationType) { this.relationType = relationType; }
    public String getParentLinkField() { return parentLinkField; }
    public void setParentLinkField(String parentLinkField) { this.parentLinkField = parentLinkField; }
    public String getChildLinkField() { return childLinkField; }
    public void setChildLinkField(String childLinkField) { this.childLinkField = childLinkField; }
    public String getOnDelete() { return onDelete; }
    public void setOnDelete(String onDelete) { this.onDelete = onDelete; }
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

- [ ] **Step 4: Create FormBusinessKey entity**

```java
package com.safevalidator.form.schema.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("form_business_key")
public class FormBusinessKey {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long formId;
    private Long fieldId;
    private Integer keyOrder;
    private LocalDateTime createTime;
    private Integer deleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getFormId() { return formId; }
    public void setFormId(Long formId) { this.formId = formId; }
    public Long getFieldId() { return fieldId; }
    public void setFieldId(Long fieldId) { this.fieldId = fieldId; }
    public Integer getKeyOrder() { return keyOrder; }
    public void setKeyOrder(Integer keyOrder) { this.keyOrder = keyOrder; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }
}
```

- [ ] **Step 5: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add 4 schema entities (FormSchema, FormFieldDef, FormRelationship, FormBusinessKey)"
```

---

## Task 5.2: Mappers

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/mapper/FormSchemaMapper.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/mapper/FormFieldDefMapper.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/mapper/FormRelationshipMapper.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/mapper/FormBusinessKeyMapper.java`
- Create: `safe-validator-form/src/main/resources/mapper/FormFieldDefMapper.xml`
- Create: `safe-validator-form/src/main/resources/mapper/FormSchemaMapper.xml`
- Create: `safe-validator-form/src/main/resources/mapper/FormRelationshipMapper.xml`
- Create: `safe-validator-form/src/main/resources/mapper/FormBusinessKeyMapper.xml`

- [ ] **Step 1: Create FormSchemaMapper**

```java
package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormSchema;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormSchemaMapper extends BaseMapper<FormSchema> {
    FormSchema selectCurrentByFormId(@Param("formId") Long formId);
    List<FormSchema> selectVersionsByFormId(@Param("formId") Long formId);
    int unsetCurrentExcept(@Param("formId") Long formId, @Param("exceptSchemaId") Long exceptSchemaId);
}
```

- [ ] **Step 2: Create FormFieldDefMapper**

```java
package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormFieldDef;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormFieldDefMapper extends BaseMapper<FormFieldDef> {
    List<FormFieldDef> selectBySchemaId(@Param("schemaId") Long schemaId);
    int clearIsLinkField(@Param("schemaId") Long schemaId, @Param("fieldCode") String fieldCode);
}
```

- [ ] **Step 3: Create FormRelationshipMapper**

```java
package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormRelationship;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormRelationshipMapper extends BaseMapper<FormRelationship> {
    List<FormRelationship> selectBySchemaId(@Param("schemaId") Long schemaId);
    List<FormRelationship> selectByParentFormId(@Param("parentFormId") Long parentFormId);
    List<FormRelationship> selectByChildFormId(@Param("childFormId") Long childFormId);
}
```

- [ ] **Step 4: Create FormBusinessKeyMapper**

```java
package com.safevalidator.form.schema.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.safevalidator.form.schema.entity.FormBusinessKey;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FormBusinessKeyMapper extends BaseMapper<FormBusinessKey> {
    List<FormBusinessKey> selectByFormId(@Param("formId") Long formId);
    int deleteByFormId(@Param("formId") Long formId);
}
```

- [ ] **Step 5: Create FormSchemaMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.form.schema.mapper.FormSchemaMapper">

    <resultMap id="schemaMap" type="com.safevalidator.form.schema.entity.FormSchema">
        <id property="id" column="id"/>
        <result property="formId" column="form_id"/>
        <result property="version" column="version"/>
        <result property="name" column="name"/>
        <result property="description" column="description"/>
        <result property="status" column="status"/>
        <result property="targetTable" column="target_table"/>
        <result property="isCurrent" column="is_current"/>
        <result property="createTime" column="create_time"/>
        <result property="updateTime" column="update_time"/>
        <result property="createBy" column="create_by"/>
        <result property="updateBy" column="update_by"/>
        <result property="deleted" column="deleted"/>
    </resultMap>

    <select id="selectCurrentByFormId" resultMap="schemaMap">
        SELECT * FROM form_schema
        WHERE form_id = #{formId} AND is_current = true AND deleted = 0
        LIMIT 1
    </select>

    <select id="selectVersionsByFormId" resultMap="schemaMap">
        SELECT * FROM form_schema
        WHERE form_id = #{formId} AND deleted = 0
        ORDER BY version DESC
    </select>

    <update id="unsetCurrentExcept">
        UPDATE form_schema SET is_current = false
        WHERE form_id = #{formId} AND deleted = 0
        <if test="exceptSchemaId != null">
            AND id != #{exceptSchemaId}
        </if>
    </update>
</mapper>
```

- [ ] **Step 6: Create FormFieldDefMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.form.schema.mapper.FormFieldDefMapper">

    <resultMap id="fieldMap" type="com.safevalidator.form.schema.entity.FormFieldDef">
        <id property="id" column="id"/>
        <result property="schemaId" column="schema_id"/>
        <result property="code" column="code"/>
        <result property="name" column="name"/>
        <result property="type" column="type"/>
        <result property="required" column="required"/>
        <result property="defaultValue" column="default_value"/>
        <result property="sortOrder" column="sort_order"/>
        <result property="config" column="config"/>
        <result property="validation" column="validation"/>
        <result property="targetColumn" column="target_column"/>
        <result property="isLinkField" column="is_link_field"/>
        <result property="createTime" column="create_time"/>
        <result property="updateTime" column="update_time"/>
        <result property="createBy" column="create_by"/>
        <result property="updateBy" column="update_by"/>
        <result property="deleted" column="deleted"/>
    </resultMap>

    <select id="selectBySchemaId" resultMap="fieldMap">
        SELECT * FROM form_field_def
        WHERE schema_id = #{schemaId} AND deleted = 0
        ORDER BY sort_order, id
    </select>

    <update id="clearIsLinkField">
        UPDATE form_field_def SET is_link_field = false
        WHERE schema_id = #{schemaId} AND code = #{fieldCode} AND deleted = 0
    </update>
</mapper>
```

- [ ] **Step 7: Create FormRelationshipMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.form.schema.mapper.FormRelationshipMapper">

    <resultMap id="relMap" type="com.safevalidator.form.schema.entity.FormRelationship">
        <id property="id" column="id"/>
        <result property="schemaId" column="schema_id"/>
        <result property="parentFormId" column="parent_form_id"/>
        <result property="childFormId" column="child_form_id"/>
        <result property="relationType" column="relation_type"/>
        <result property="parentLinkField" column="parent_link_field"/>
        <result property="childLinkField" column="child_link_field"/>
        <result property="onDelete" column="on_delete"/>
        <result property="createTime" column="create_time"/>
        <result property="updateTime" column="update_time"/>
        <result property="createBy" column="create_by"/>
        <result property="updateBy" column="update_by"/>
        <result property="deleted" column="deleted"/>
    </resultMap>

    <select id="selectBySchemaId" resultMap="relMap">
        SELECT * FROM form_relationship
        WHERE schema_id = #{schemaId} AND deleted = 0
    </select>

    <select id="selectByParentFormId" resultMap="relMap">
        SELECT * FROM form_relationship
        WHERE parent_form_id = #{parentFormId} AND deleted = 0
    </select>

    <select id="selectByChildFormId" resultMap="relMap">
        SELECT * FROM form_relationship
        WHERE child_form_id = #{childFormId} AND deleted = 0
    </select>
</mapper>
```

- [ ] **Step 8: Create FormBusinessKeyMapper.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.safevalidator.form.schema.mapper.FormBusinessKeyMapper">

    <resultMap id="keyMap" type="com.safevalidator.form.schema.entity.FormBusinessKey">
        <id property="id" column="id"/>
        <result property="formId" column="form_id"/>
        <result property="fieldId" column="field_id"/>
        <result property="keyOrder" column="key_order"/>
        <result property="createTime" column="create_time"/>
        <result property="deleted" column="deleted"/>
    </resultMap>

    <select id="selectByFormId" resultMap="keyMap">
        SELECT * FROM form_business_key
        WHERE form_id = #{formId} AND deleted = 0
        ORDER BY key_order
    </select>

    <delete id="deleteByFormId">
        UPDATE form_business_key SET deleted = 1
        WHERE form_id = #{formId}
    </delete>
</mapper>
```

- [ ] **Step 9: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add mappers + MyBatis XML for 4 schema entities"
```

---

## Task 5.3: FormSchemaService

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/service/FormSchemaService.java`

- [ ] **Step 1: Create FormSchemaService**

```java
package com.safevalidator.form.schema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.*;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import com.safevalidator.form.schema.mapper.FormRelationshipMapper;
import com.safevalidator.form.schema.mapper.FormSchemaMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class FormSchemaService {

    private final FormSchemaMapper schemaMapper;
    private final FormFieldDefMapper fieldMapper;
    private final FormRelationshipMapper relMapper;
    private final ObjectMapper objectMapper;

    public FormSchemaService(FormSchemaMapper schemaMapper, FormFieldDefMapper fieldMapper,
                             FormRelationshipMapper relMapper, ObjectMapper objectMapper) {
        this.schemaMapper = schemaMapper;
        this.fieldMapper = fieldMapper;
        this.relMapper = relMapper;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Long createForm(CreateFormRequest req) {
        FormSchema schema = new FormSchema();
        schema.setFormId(null);   // will be set after insert
        schema.setVersion(1);
        schema.setName(req.name());
        schema.setDescription(req.description());
        schema.setStatus(1);
        schema.setTargetTable(null);
        schema.setIsCurrent(true);
        schemaMapper.insert(schema);
        schema.setFormId(schema.getId());
        schemaMapper.updateById(schema);
        return schema.getFormId();
    }

    public FormSchema getCurrentSchema(Long formId) {
        FormSchema s = schemaMapper.selectCurrentByFormId(formId);
        if (s == null) throw new BizException(ErrorCode.FORM_NOT_FOUND);
        return s;
    }

    public SchemaDetailVO getCurrentSchemaDetail(Long formId) {
        FormSchema s = getCurrentSchema(formId);
        return toDetailVO(s);
    }

    public SchemaDetailVO getVersionDetail(Long formId, int version) {
        FormSchema s = schemaMapper.selectVersionsByFormId(formId).stream()
                .filter(x -> x.getVersion() == version)
                .findFirst()
                .orElseThrow(() -> new BizException(ErrorCode.FORM_NOT_FOUND));
        return toDetailVO(s);
    }

    public List<SchemaVersionVO> listVersions(Long formId) {
        return schemaMapper.selectVersionsByFormId(formId).stream()
                .map(s -> new SchemaVersionVO(
                        s.getId(), s.getFormId(), s.getVersion(),
                        s.getIsCurrent(), s.getName(), s.getCreateTime()))
                .toList();
    }

    @Transactional
    public Long publishNewVersion(Long formId, UpdateSchemaRequest req) {
        FormSchema current = getCurrentSchema(formId);
        if (current.getTargetTable() != null) {
            // mapped form: validation happens via MappingEngine; skip
        }

        // 1. unset old current
        schemaMapper.unsetCurrentExcept(formId, null);

        // 2. create new schema
        FormSchema newSchema = new FormSchema();
        newSchema.setFormId(formId);
        newSchema.setVersion(current.getVersion() + 1);
        newSchema.setName(req.name() != null ? req.name() : current.getName());
        newSchema.setDescription(req.description() != null ? req.description() : current.getDescription());
        newSchema.setStatus(current.getStatus());
        newSchema.setTargetTable(current.getTargetTable());
        newSchema.setIsCurrent(true);
        schemaMapper.insert(newSchema);

        // 3. apply new fields (delete old, create new)
        // Note: for MVP we replace all fields (full version snapshot)
        for (FormFieldDef old : fieldMapper.selectBySchemaId(current.getId())) {
            fieldMapper.deleteById(old.getId());
        }
        if (req.fields() != null) {
            int order = 0;
            for (CreateFieldRequest f : req.fields()) {
                FormFieldDef def = new FormFieldDef();
                def.setSchemaId(newSchema.getId());
                def.setCode(f.code());
                def.setName(f.name());
                def.setType(f.type());
                def.setRequired(Boolean.TRUE.equals(f.required()));
                def.setDefaultValue(f.defaultValue());
                def.setSortOrder(f.sortOrder() != null ? f.sortOrder() : order++);
                def.setConfig(toJson(f.config()));
                def.setValidation(toJson(f.validation()));
                def.setTargetColumn(f.targetColumn());
                def.setIsLinkField(false);
                fieldMapper.insert(def);
            }
        }

        // 4. apply new relationships
        for (FormRelationship old : relMapper.selectBySchemaId(current.getId())) {
            relMapper.deleteById(old.getId());
        }
        if (req.relationships() != null) {
            for (CreateRelationshipRequest r : req.relationships()) {
                FormRelationship rel = new FormRelationship();
                rel.setSchemaId(newSchema.getId());
                rel.setParentFormId(r.parentFormId());
                rel.setChildFormId(r.childFormId());
                rel.setRelationType(r.relationType());
                rel.setParentLinkField(r.parentLinkField());
                rel.setChildLinkField(r.childLinkField());
                rel.setOnDelete(r.onDelete() != null ? r.onDelete() : "CASCADE");
                relMapper.insert(rel);

                // mark child field as link field
                fieldMapper.clearIsLinkField(newSchema.getId(), r.childLinkField());
            }
        }

        return newSchema.getId();
    }

    public List<FormFieldDefVO> listFields(Long formId) {
        FormSchema s = getCurrentSchema(formId);
        return fieldMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toFieldVO)
                .toList();
    }

    public List<FormFieldDefVO> listFieldsBySchemaId(Long schemaId) {
        return fieldMapper.selectBySchemaId(schemaId).stream()
                .map(this::toFieldVO)
                .toList();
    }

    public List<RelationshipVO> listRelationships(Long formId) {
        FormSchema s = getCurrentSchema(formId);
        return relMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toRelVO)
                .toList();
    }

    public SchemaDetailVO toDetailVO(FormSchema s) {
        List<FormFieldDefVO> fields = fieldMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toFieldVO)
                .toList();
        List<RelationshipVO> rels = relMapper.selectBySchemaId(s.getId()).stream()
                .map(this::toRelVO)
                .toList();
        return new SchemaDetailVO(
                s.getFormId(), s.getVersion(), s.getId(),
                s.getName(), s.getDescription(), s.getTargetTable(),
                s.getIsCurrent(), s.getCreateTime(),
                fields, rels);
    }

    public FormFieldDefVO toFieldVO(FormFieldDef f) {
        return new FormFieldDefVO(
                f.getId(), f.getSchemaId(), f.getCode(), f.getName(), f.getType(),
                f.getRequired(), f.getDefaultValue(), f.getSortOrder(),
                parseJsonMap(f.getConfig()), parseJsonMap(f.getValidation()),
                f.getTargetColumn(), f.getIsLinkField(),
                f.getCreateTime(), f.getUpdateTime());
    }

    public RelationshipVO toRelVO(FormRelationship r) {
        return new RelationshipVO(
                r.getId(), r.getSchemaId(), r.getParentFormId(), r.getChildFormId(),
                r.getRelationType(), r.getParentLinkField(), r.getChildLinkField(),
                r.getOnDelete(), r.getCreateTime());
    }

    private String toJson(Map<String, Object> map) {
        if (map == null) return null;
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "JSON serialize failed: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add FormSchemaService with create/list/publishNewVersion"
```

---

## Task 5.4: FormFieldDefService + FormRelationshipService

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/service/FormFieldDefService.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/service/FormRelationshipService.java`

- [ ] **Step 1: Create FormFieldDefService**

```java
package com.safevalidator.form.schema.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.CreateFieldRequest;
import com.safevalidator.form.schema.dto.FormFieldDefVO;
import com.safevalidator.form.schema.dto.UpdateFieldRequest;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class FormFieldDefService {

    private final FormFieldDefMapper fieldMapper;
    private final FormSchemaService schemaService;
    private final ObjectMapper objectMapper;

    public FormFieldDefService(FormFieldDefMapper fieldMapper, FormSchemaService schemaService,
                               ObjectMapper objectMapper) {
        this.fieldMapper = fieldMapper;
        this.schemaService = schemaService;
        this.objectMapper = objectMapper;
    }

    public Long addField(Long formId, CreateFieldRequest req) {
        FormSchema s = schemaService.getCurrentSchema(formId);
        // uniqueness check
        Long existing = fieldMapper.selectCount(
                new LambdaQueryWrapper<FormFieldDef>()
                        .eq(FormFieldDef::getSchemaId, s.getId())
                        .eq(FormFieldDef::getCode, req.code()));
        if (existing > 0) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "字段 code 重复: " + req.code());
        }
        // mapped form requires target_column
        if (s.getTargetTable() != null && (req.targetColumn() == null || req.targetColumn().isBlank())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "已映射表单的每个字段必须配置 targetColumn");
        }
        // unmapped form must NOT have target_column
        if (s.getTargetTable() == null && req.targetColumn() != null && !req.targetColumn().isBlank()) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "未映射表单不能配置 targetColumn");
        }

        FormFieldDef def = new FormFieldDef();
        def.setSchemaId(s.getId());
        def.setCode(req.code());
        def.setName(req.name());
        def.setType(req.type());
        def.setRequired(Boolean.TRUE.equals(req.required()));
        def.setDefaultValue(req.defaultValue());
        def.setSortOrder(req.sortOrder() != null ? req.sortOrder() : nextOrder(s.getId()));
        def.setConfig(toJson(req.config()));
        def.setValidation(toJson(req.validation()));
        def.setTargetColumn(req.targetColumn());
        def.setIsLinkField(false);
        fieldMapper.insert(def);
        return def.getId();
    }

    public void updateField(Long fieldId, UpdateFieldRequest req) {
        FormFieldDef def = fieldMapper.selectById(fieldId);
        if (def == null) throw new BizException(ErrorCode.FORM_FIELD_NOT_FOUND);
        if (Boolean.TRUE.equals(def.getIsLinkField())) {
            throw new BizException(ErrorCode.FORM_FIELD_IN_USE, "链接字段不可修改");
        }
        if (req.name() != null) def.setName(req.name());
        if (req.type() != null) def.setType(req.type());
        if (req.required() != null) def.setRequired(req.required());
        if (req.defaultValue() != null) def.setDefaultValue(req.defaultValue());
        if (req.sortOrder() != null) def.setSortOrder(req.sortOrder());
        if (req.config() != null) def.setConfig(toJson(req.config()));
        if (req.validation() != null) def.setValidation(toJson(req.validation()));
        if (req.targetColumn() != null) def.setTargetColumn(req.targetColumn());
        fieldMapper.updateById(def);
    }

    public void deleteField(Long fieldId) {
        FormFieldDef def = fieldMapper.selectById(fieldId);
        if (def == null) throw new BizException(ErrorCode.FORM_FIELD_NOT_FOUND);
        if (Boolean.TRUE.equals(def.getIsLinkField())) {
            throw new BizException(ErrorCode.FORM_FIELD_IN_USE, "链接字段不可删除");
        }
        fieldMapper.deleteById(fieldId);
    }

    public FormFieldDef getById(Long fieldId) {
        FormFieldDef f = fieldMapper.selectById(fieldId);
        if (f == null) throw new BizException(ErrorCode.FORM_FIELD_NOT_FOUND);
        return f;
    }

    private int nextOrder(Long schemaId) {
        return fieldMapper.selectBySchemaId(schemaId).size();
    }

    private String toJson(Map<String, Object> map) {
        if (map == null) return null;
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
```

- [ ] **Step 2: Create FormRelationshipService**

```java
package com.safevalidator.form.schema.service;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.dto.CreateRelationshipRequest;
import com.safevalidator.form.schema.dto.RelationshipVO;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormRelationship;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import com.safevalidator.form.schema.mapper.FormRelationshipMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class FormRelationshipService {

    private static final Set<String> VALID_TYPES = Set.of("ONE_TO_ONE", "ONE_TO_MANY");
    private static final Set<String> VALID_ON_DELETE = Set.of("CASCADE", "SET_NULL", "RESTRICT");

    private final FormRelationshipMapper relMapper;
    private final FormFieldDefMapper fieldMapper;
    private final FormSchemaService schemaService;

    public FormRelationshipService(FormRelationshipMapper relMapper, FormFieldDefMapper fieldMapper,
                                    FormSchemaService schemaService) {
        this.relMapper = relMapper;
        this.fieldMapper = fieldMapper;
        this.schemaService = schemaService;
    }

    @Transactional
    public Long create(Long formId, CreateRelationshipRequest req) {
        if (!VALID_TYPES.contains(req.relationType())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "Invalid relationType: " + req.relationType());
        }
        if (req.onDelete() != null && !VALID_ON_DELETE.contains(req.onDelete())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "Invalid onDelete: " + req.onDelete());
        }
        FormSchema s = schemaService.getCurrentSchema(formId);

        // validate child link field exists and is required
        List<FormFieldDef> childFields = fieldMapper.selectBySchemaId(
                schemaService.getCurrentSchema(req.childFormId()).getId());
        FormFieldDef linkField = childFields.stream()
                .filter(f -> f.getCode().equals(req.childLinkField()))
                .findFirst()
                .orElseThrow(() -> new BizException(ErrorCode.FORM_FIELD_NOT_FOUND,
                        "子表单中找不到字段: " + req.childLinkField()));
        if (!Boolean.TRUE.equals(linkField.getRequired())) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                    "链接字段必须为必填: " + req.childLinkField());
        }

        FormRelationship rel = new FormRelationship();
        rel.setSchemaId(s.getId());
        rel.setParentFormId(req.parentFormId());
        rel.setChildFormId(req.childFormId());
        rel.setRelationType(req.relationType());
        rel.setParentLinkField(req.parentLinkField());
        rel.setChildLinkField(req.childLinkField());
        rel.setOnDelete(req.onDelete() != null ? req.onDelete() : "CASCADE");
        relMapper.insert(rel);

        // mark child link field
        linkField.setIsLinkField(true);
        fieldMapper.updateById(linkField);

        return rel.getId();
    }

    public void delete(Long relId) {
        FormRelationship rel = relMapper.selectById(relId);
        if (rel == null) return;
        relMapper.deleteById(relId);
        // unmark link field
        FormFieldDef f = fieldMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<FormFieldDef>()
                        .eq(FormFieldDef::getSchemaId, rel.getSchemaId())
                        .eq(FormFieldDef::getCode, rel.getChildLinkField()));
        if (f != null && Boolean.TRUE.equals(f.getIsLinkField())) {
            f.setIsLinkField(false);
            fieldMapper.updateById(f);
        }
    }

    public List<RelationshipVO> listByFormId(Long formId) {
        FormSchema s = schemaService.getCurrentSchema(formId);
        return relMapper.selectBySchemaId(s.getId()).stream()
                .map(r -> new RelationshipVO(
                        r.getId(), r.getSchemaId(), r.getParentFormId(), r.getChildFormId(),
                        r.getRelationType(), r.getParentLinkField(), r.getChildLinkField(),
                        r.getOnDelete(), r.getCreateTime()))
                .toList();
    }
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add FormFieldDefService and FormRelationshipService"
```

---

## Task 5.5: FormBusinessKeyService

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/schema/service/FormBusinessKeyService.java`

- [ ] **Step 1: Create FormBusinessKeyService**

```java
package com.safevalidator.form.schema.service;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.schema.entity.FormBusinessKey;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.mapper.FormBusinessKeyMapper;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class FormBusinessKeyService {

    private final FormBusinessKeyMapper keyMapper;
    private final FormFieldDefMapper fieldMapper;
    private final FormSchemaService schemaService;

    public FormBusinessKeyService(FormBusinessKeyMapper keyMapper, FormFieldDefMapper fieldMapper,
                                  FormSchemaService schemaService) {
        this.keyMapper = keyMapper;
        this.fieldMapper = fieldMapper;
        this.schemaService = schemaService;
    }

    public List<FormBusinessKey> get(Long formId) {
        return keyMapper.selectByFormId(formId);
    }

    @Transactional
    public void set(Long formId, List<Long> fieldIdsInOrder) {
        if (fieldIdsInOrder == null) fieldIdsInOrder = List.of();

        // validate all field IDs belong to this form's current schema and are required
        var schema = schemaService.getCurrentSchema(formId);
        var currentFields = fieldMapper.selectBySchemaId(schema.getId());
        List<FormFieldDef> resolved = new ArrayList<>();
        for (Long fid : fieldIdsInOrder) {
            FormFieldDef f = currentFields.stream()
                    .filter(x -> x.getId().equals(fid))
                    .findFirst()
                    .orElseThrow(() -> new BizException(ErrorCode.FORM_FIELD_NOT_FOUND,
                            "字段不属于此表单: " + fid));
            if (!Boolean.TRUE.equals(f.getRequired())) {
                throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                        "业务主键字段必须必填: " + f.getCode());
            }
            resolved.add(f);
        }

        // delete old + insert new
        keyMapper.deleteByFormId(formId);
        int order = 1;
        for (FormFieldDef f : resolved) {
            FormBusinessKey k = new FormBusinessKey();
            k.setFormId(formId);
            k.setFieldId(f.getId());
            k.setKeyOrder(order++);
            keyMapper.insert(k);
        }
    }
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add FormBusinessKeyService for composite business keys"
```

**Phase 5 complete.** Proceed to [Part 6: Engines + FormDataService + Cascade Delete](2026-06-26-form-schema-backend-part6-runtime.md).
