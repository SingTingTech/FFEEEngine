package com.safevalidator.form.runtime.engine;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.mapping.engine.MappingEngine;
import com.safevalidator.form.mapping.dto.BuiltSql;
import com.safevalidator.form.schema.entity.FormFieldDef;
import com.safevalidator.form.schema.entity.FormRelationship;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.mapper.FormFieldDefMapper;
import com.safevalidator.form.schema.mapper.FormRelationshipMapper;
import com.safevalidator.form.schema.service.FormSchemaService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CascadeDeleteEngine {

    private final FormSchemaService schemaService;
    private final FormRelationshipMapper relMapper;
    private final FormFieldDefMapper fieldMapper;
    private final MappingEngine mappingEngine;
    private final JdbcTemplate jdbcTemplate;

    public CascadeDeleteEngine(FormSchemaService schemaService, FormRelationshipMapper relMapper,
                               FormFieldDefMapper fieldMapper, MappingEngine mappingEngine,
                               JdbcTemplate jdbcTemplate) {
        this.schemaService = schemaService;
        this.relMapper = relMapper;
        this.fieldMapper = fieldMapper;
        this.mappingEngine = mappingEngine;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Returns true if delete is safe to proceed (no RESTRICT violations), false otherwise. */
    public void cascadeDelete(Long formId, Long recordId) {
        FormSchema parentSchema = schemaService.getCurrentSchema(formId);
        List<FormRelationship> rels = relMapper.selectByParentFormId(formId);

        for (FormRelationship rel : rels) {
            if ("RESTRICT".equals(rel.getOnDelete()) && hasChild(rel, recordId)) {
                throw new BizException(ErrorCode.FORM_RELATIONSHIP_BLOCKED,
                        "存在子数据，无法删除（" + rel.getRelationType() + "）");
            }
        }

        for (FormRelationship rel : rels) {
            switch (rel.getOnDelete()) {
                case "CASCADE" -> cascadeForRelationship(rel, recordId);
                case "SET_NULL" -> setNullForRelationship(rel, recordId);
                case "RESTRICT" -> { /* already checked above */ }
                default -> throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                        "Unknown onDelete: " + rel.getOnDelete());
            }
        }
    }

    private void cascadeForRelationship(FormRelationship rel, Long parentId) {
        FormSchema childSchema = schemaService.getCurrentSchema(rel.getChildFormId());
        if (childSchema.getTargetTable() != null) {
            // mapped child: get linking column from child field
            FormFieldDef linkField = findChildLinkField(childSchema.getId(), rel.getChildLinkField());
            if (linkField == null || linkField.getTargetColumn() == null) {
                throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                        "子表单的链接字段缺少 targetColumn");
            }
            BuiltSql sql = mappingEngine.buildDeleteChildren(childSchema.getTargetTable(),
                    linkField.getTargetColumn(), parentId);
            mappingEngine.executeUpdate(sql);
        } else {
            // form_data child: UPDATE form_data SET deleted=1 WHERE data->>? = ?
            String sql = "UPDATE form_data SET deleted = 1 WHERE form_id = ? AND data->>? = ?";
            jdbcTemplate.update(sql, rel.getChildFormId(), rel.getChildLinkField(), parentId.toString());
        }
    }

    private void setNullForRelationship(FormRelationship rel, Long parentId) {
        // MVP: skip SET_NULL (would need to know storage details of child field)
        // In practice, for form_data, we could do: UPDATE form_data SET data = data - <key> WHERE ...
        // For mapped, UPDATE child_table SET linking_col = NULL WHERE linking_col = ?
        FormSchema childSchema = schemaService.getCurrentSchema(rel.getChildFormId());
        if (childSchema.getTargetTable() != null) {
            FormFieldDef linkField = findChildLinkField(childSchema.getId(), rel.getChildLinkField());
            if (linkField != null && linkField.getTargetColumn() != null) {
                String sql = "UPDATE " + childSchema.getTargetTable() +
                        " SET " + linkField.getTargetColumn() + " = NULL WHERE " +
                        linkField.getTargetColumn() + " = ?";
                jdbcTemplate.update(sql, parentId);
            }
        } else {
            String sql = "UPDATE form_data SET data = data - ? WHERE form_id = ? AND data->>? = ?";
            jdbcTemplate.update(sql, rel.getChildLinkField(), rel.getChildFormId(),
                    rel.getChildLinkField(), parentId.toString());
        }
    }

    private boolean hasChild(FormRelationship rel, Long parentId) {
        FormSchema childSchema = schemaService.getCurrentSchema(rel.getChildFormId());
        if (childSchema.getTargetTable() != null) {
            FormFieldDef linkField = findChildLinkField(childSchema.getId(), rel.getChildLinkField());
            if (linkField == null || linkField.getTargetColumn() == null) return false;
            String sql = "SELECT 1 FROM " + childSchema.getTargetTable() +
                    " WHERE " + linkField.getTargetColumn() + " = ? AND deleted = 0 LIMIT 1";
            java.util.List<Long> r = jdbcTemplate.query(sql, (rs, rn) -> rs.getLong(1), parentId);
            return !r.isEmpty();
        } else {
            String sql = "SELECT 1 FROM form_data WHERE form_id = ? AND data->>? = ? AND deleted = 0 LIMIT 1";
            java.util.List<Long> r = jdbcTemplate.query(sql, (rs, rn) -> rs.getLong(1),
                    rel.getChildFormId(), rel.getChildLinkField(), parentId.toString());
            return !r.isEmpty();
        }
    }

    private FormFieldDef findChildLinkField(Long schemaId, String fieldCode) {
        return fieldMapper.selectBySchemaId(schemaId).stream()
                .filter(f -> f.getCode().equals(fieldCode))
                .findFirst()
                .orElse(null);
    }
}
