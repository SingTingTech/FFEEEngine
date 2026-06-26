package com.safevalidator.form.runtime.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.mapping.engine.MappingEngine;
import com.safevalidator.form.mapping.dto.BuiltSql;
import com.safevalidator.form.runtime.dto.ChildSubmit;
import com.safevalidator.form.runtime.dto.ChildSubmitResult;
import com.safevalidator.form.runtime.dto.FormRecord;
import com.safevalidator.form.runtime.dto.FormSubmitRequest;
import com.safevalidator.form.runtime.dto.FormSubmitResult;
import com.safevalidator.form.runtime.dto.FormValidationResult;
import com.safevalidator.form.runtime.engine.CascadeDeleteEngine;
import com.safevalidator.form.schema.dto.FormFieldDefVO;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormRelationship;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import com.safevalidator.form.schema.mapper.FormRelationshipMapper;
import com.safevalidator.form.schema.service.FormSchemaService;
import com.safevalidator.form.validation.ValidationEngine;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FormDataService {

    private final FormSchemaService schemaService;
    private final FormFieldDefMapper fieldMapper;
    private final FormRelationshipMapper relMapper;
    private final ValidationEngine validationEngine;
    private final MappingEngine mappingEngine;
    private final CascadeDeleteEngine cascadeEngine;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public FormDataService(FormSchemaService schemaService, FormFieldDefMapper fieldMapper,
                           FormRelationshipMapper relMapper, ValidationEngine validationEngine,
                           MappingEngine mappingEngine, CascadeDeleteEngine cascadeEngine,
                           JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.schemaService = schemaService;
        this.fieldMapper = fieldMapper;
        this.relMapper = relMapper;
        this.validationEngine = validationEngine;
        this.mappingEngine = mappingEngine;
        this.cascadeEngine = cascadeEngine;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public FormSubmitResult submit(FormSubmitRequest req) {
        FormSchema parentSchema = schemaService.getCurrentSchema(req.formId());
        List<FormFieldDefVO> parentFields = schemaService.listFieldsBySchemaId(parentSchema.getId());

        // 1. validate parent + children
        Map<Long, List<FormFieldDefVO>> childFieldsByFormId = new HashMap<>();
        if (req.children() != null) {
            for (ChildSubmit c : req.children()) {
                if (!childFieldsByFormId.containsKey(c.formId())) {
                    childFieldsByFormId.put(c.formId(),
                            schemaService.listFieldsBySchemaId(
                                    schemaService.getCurrentSchema(c.formId()).getId()));
                }
            }
        }
        FormValidationResult validation = validationEngine.validateForm(req, parentFields, childFieldsByFormId);
        if (!validation.isOk()) {
            String detail;
            try {
                detail = objectMapper.writeValueAsString(validation);
            } catch (Exception e) {
                detail = validation.toString();
            }
            throw new BizException(ErrorCode.FORM_VALIDATION_FAILED, detail);
        }

        // 2. save parent
        Long parentId;
        if (parentSchema.getTargetTable() != null) {
            parentId = saveMappedParent(parentSchema, parentFields, req.data());
        } else {
            parentId = saveUnmappedParent(parentSchema, req.data());
        }

        // 3. save children (with linking field injected)
        List<ChildSubmitResult> childResults = new ArrayList<>();
        if (req.children() != null) {
            for (ChildSubmit c : req.children()) {
                Map<String, Object> childData = new HashMap<>(c.data() == null ? Map.of() : c.data());
                // find the relationship for this child → inject linking
                FormRelationship rel = findRelationship(parentSchema.getFormId(), c.formId());
                if (rel != null && rel.getChildLinkField() != null) {
                    childData.put(rel.getChildLinkField(), parentId);
                }
                FormSchema childSchema = schemaService.getCurrentSchema(c.formId());
                Long childId;
                if (childSchema.getTargetTable() != null) {
                    childId = saveMappedChild(childSchema, childFieldsByFormId.get(c.formId()), childData);
                } else {
                    childId = saveUnmappedChild(childSchema, childData);
                }
                childResults.add(new ChildSubmitResult(c.formId(), childId));
            }
        }

        return new FormSubmitResult(parentId, parentSchema.getFormId(), parentSchema.getVersion(), childResults);
    }

    private Long saveMappedParent(FormSchema schema, List<FormFieldDefVO> fields, Map<String, Object> data) {
        List<FormFieldDef> fieldEnts = fields.stream().map(this::toEntity).toList();
        BuiltSql sql = mappingEngine.buildInsert(schema.getTargetTable(), fieldEnts, data);
        return mappingEngine.executeInsert(sql);
    }

    private Long saveUnmappedParent(FormSchema schema, Map<String, Object> data) {
        try {
            String json = objectMapper.writeValueAsString(data == null ? Map.of() : data);
            Long newId = com.baomidou.mybatisplus.core.toolkit.IdWorker.getId();
            jdbcTemplate.update(
                    "INSERT INTO form_data (id, form_id, data) VALUES (?, ?, ?::jsonb)",
                    newId, schema.getFormId(), json);
            return newId;
        } catch (Exception e) {
            throw new BizException(ErrorCode.SYSTEM_ERROR, "Failed to save form_data: " + e.getMessage());
        }
    }

    private Long saveMappedChild(FormSchema schema, List<FormFieldDefVO> fields, Map<String, Object> data) {
        List<FormFieldDef> fieldEnts = fields.stream().map(this::toEntity).toList();
        BuiltSql sql = mappingEngine.buildInsert(schema.getTargetTable(), fieldEnts, data);
        return mappingEngine.executeInsert(sql);
    }

    private Long saveUnmappedChild(FormSchema schema, Map<String, Object> data) {
        return saveUnmappedParent(schema, data);
    }

    public FormRecord getById(Long formId, Long recordId) {
        FormSchema schema = schemaService.getCurrentSchema(formId);
        List<FormFieldDefVO> fields = schemaService.listFieldsBySchemaId(schema.getId());

        FormRecord record;
        if (schema.getTargetTable() != null) {
            record = readMappedRecord(schema, fields, recordId);
        } else {
            record = readUnmappedRecord(schema, fields, recordId);
        }
        if (record == null) throw new BizException(ErrorCode.FORM_DATA_NOT_FOUND);

        // read children
        List<FormRecord> children = new ArrayList<>();
        for (FormRelationship rel : relMapper.selectByParentFormId(formId)) {
            children.addAll(listChildren(formId, recordId, rel.getChildFormId()));
        }
        return new FormRecord(record.id(), record.formId(), record.formVersion(), record.data(), children);
    }

    private FormRecord readMappedRecord(FormSchema schema, List<FormFieldDefVO> fields, Long recordId) {
        BuiltSql sql = mappingEngine.buildSelect(schema.getTargetTable(), recordId);
        List<Map<String, String>> rows = mappingEngine.queryForList(sql);
        if (rows.isEmpty()) return null;
        Map<String, Object> data = mappingEngine.convertRowFromStorage(rows.get(0),
                fields.stream().map(this::toEntity).toList());
        // strip link fields
        for (FormFieldDefVO f : fields) {
            if (Boolean.TRUE.equals(f.isLinkField())) data.remove(f.code());
        }
        return new FormRecord(recordId, schema.getFormId(), schema.getVersion(), data, List.of());
    }

    private FormRecord readUnmappedRecord(FormSchema schema, List<FormFieldDefVO> fields, Long recordId) {
        String sql = "SELECT id, form_id, data FROM form_data WHERE id = ? AND deleted = 0";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, recordId);
        if (rows.isEmpty()) return null;
        Map<String, Object> row = rows.get(0);
        Map<String, Object> data = readJsonb(row.get("data"));
        // strip link fields from display
        for (FormFieldDefVO f : fields) {
            if (Boolean.TRUE.equals(f.isLinkField())) data.remove(f.code());
        }
        return new FormRecord(recordId, schema.getFormId(), schema.getVersion(), data, List.of());
    }

    public List<FormRecord> listChildren(Long formId, Long parentId, Long childFormId) {
        FormSchema childSchema = schemaService.getCurrentSchema(childFormId);
        List<FormFieldDefVO> childFields = schemaService.listFieldsBySchemaId(childSchema.getId());
        List<FormRecord> result = new ArrayList<>();
        if (childSchema.getTargetTable() != null) {
            // find the linking field (in current schema) to know which column to use
            FormRelationship rel = findRelationship(formId, childFormId);
            if (rel == null) return List.of();
            FormFieldDefVO linkField = childFields.stream()
                    .filter(f -> f.code().equals(rel.getChildLinkField()))
                    .findFirst().orElse(null);
            if (linkField == null || linkField.targetColumn() == null) return List.of();
            BuiltSql sql = mappingEngine.buildSelectChildren(
                    childSchema.getTargetTable(), linkField.targetColumn(), parentId);
            List<Map<String, String>> rows = mappingEngine.queryForList(sql);
            for (Map<String, String> row : rows) {
                Long cid = Long.parseLong(row.get("id"));
                Map<String, Object> data = mappingEngine.convertRowFromStorage(row,
                        childFields.stream().map(this::toEntity).toList());
                for (FormFieldDefVO f : childFields) {
                    if (Boolean.TRUE.equals(f.isLinkField())) data.remove(f.code());
                }
                result.add(new FormRecord(cid, childFormId, childSchema.getVersion(), data, List.of()));
            }
        } else {
            String sql = "SELECT id, data FROM form_data WHERE form_id = ? AND data->>? = ? AND deleted = 0 ORDER BY id";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql,
                    childFormId,
                    findRelationship(formId, childFormId).getChildLinkField(),
                    parentId.toString());
            for (Map<String, Object> row : rows) {
                Long cid = ((Number) row.get("id")).longValue();
                Map<String, Object> data = readJsonb(row.get("data"));
                for (FormFieldDefVO f : childFields) {
                    if (Boolean.TRUE.equals(f.isLinkField())) data.remove(f.code());
                }
                result.add(new FormRecord(cid, childFormId, childSchema.getVersion(), data, List.of()));
            }
        }
        return result;
    }

    public PageResult<FormRecord> page(Long formId, PageQuery query) {
        FormSchema schema = schemaService.getCurrentSchema(formId);
        if (schema.getTargetTable() != null) {
            // MVP: simplest impl — list all rows from mapped table
            String sql = "SELECT id FROM " + schema.getTargetTable() + " WHERE deleted = 0 ORDER BY id DESC LIMIT ? OFFSET ?";
            int limit = query.pageSize();
            int offset = (query.pageNum() - 1) * query.pageSize();
            List<FormRecord> records = new ArrayList<>();
            for (Long id : jdbcTemplate.query(sql, (rs, rn) -> rs.getLong(1), limit, offset)) {
                try {
                    records.add(getById(formId, id));
                } catch (Exception ignored) {}
            }
            Long total = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + schema.getTargetTable() + " WHERE deleted = 0", Long.class);
            return PageResult.of(records, total == null ? 0L : total, query.pageNum(), query.pageSize());
        } else {
            String sql = "SELECT id FROM form_data WHERE form_id = ? AND deleted = 0 ORDER BY id DESC LIMIT ? OFFSET ?";
            int limit = query.pageSize();
            int offset = (query.pageNum() - 1) * query.pageSize();
            List<FormRecord> records = new ArrayList<>();
            for (Long id : jdbcTemplate.query(sql, (rs, rn) -> rs.getLong(1),
                    schema.getFormId(), limit, offset)) {
                try {
                    records.add(getById(formId, id));
                } catch (Exception ignored) {}
            }
            Long total = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM form_data WHERE form_id = ? AND deleted = 0", Long.class,
                    schema.getFormId());
            return PageResult.of(records, total == null ? 0L : total, query.pageNum(), query.pageSize());
        }
    }

    @Transactional
    public void delete(Long formId, Long recordId) {
        // 1. cascade children
        cascadeEngine.cascadeDelete(formId, recordId);

        // 2. delete parent
        FormSchema schema = schemaService.getCurrentSchema(formId);
        if (schema.getTargetTable() != null) {
            BuiltSql sql = mappingEngine.buildLogicalDelete(schema.getTargetTable(), recordId);
            mappingEngine.executeUpdate(sql);
        } else {
            jdbcTemplate.update("UPDATE form_data SET deleted = 1 WHERE id = ?", recordId);
        }
    }

    private FormRelationship findRelationship(Long parentFormId, Long childFormId) {
        return relMapper.selectByParentFormId(parentFormId).stream()
                .filter(r -> r.getChildFormId().equals(childFormId))
                .findFirst().orElse(null);
    }

    private FormFieldDef toEntity(FormFieldDefVO v) {
        FormFieldDef f = new FormFieldDef();
        f.setId(v.id());
        f.setSchemaId(v.schemaId());
        f.setCode(v.code());
        f.setName(v.name());
        f.setType(v.type());
        f.setRequired(v.required());
        f.setDefaultValue(v.defaultValue());
        f.setSortOrder(v.sortOrder());
        try {
            f.setConfig(v.config() == null ? null : objectMapper.writeValueAsString(v.config()));
            f.setValidation(v.validation() == null ? null : objectMapper.writeValueAsString(v.validation()));
        } catch (Exception ignored) {}
        f.setTargetColumn(v.targetColumn());
        f.setSectionId(v.sectionId());
        f.setIsLinkField(v.isLinkField());
        return f;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readJsonb(Object data) {
        if (data == null) return Map.of();
        if (data instanceof org.postgresql.util.PGobject pg) {
            try {
                return objectMapper.readValue(pg.getValue(), Map.class);
            } catch (Exception e) {
                return Map.of();
            }
        }
        if (data instanceof Map) return (Map<String, Object>) data;
        return Map.of();
    }
}
