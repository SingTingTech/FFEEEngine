package com.safevalidator.form.runtime.engine;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.api.PageQuery;
import com.safevalidator.common.api.PageResult;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.mapping.engine.MappingEngine;
import com.safevalidator.form.runtime.dto.ReferenceOption;
import com.safevalidator.form.schema.dto.FormFieldDefVO;
import com.safevalidator.form.schema.entity.FormSchema;
import com.safevalidator.form.schema.service.FormSchemaService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class FormReferenceEngine {

    private final FormSchemaService schemaService;
    private final JdbcTemplate jdbcTemplate;
    private final MappingEngine mappingEngine;

    public FormReferenceEngine(FormSchemaService schemaService, JdbcTemplate jdbcTemplate,
                               MappingEngine mappingEngine) {
        this.schemaService = schemaService;
        this.jdbcTemplate = jdbcTemplate;
        this.mappingEngine = mappingEngine;
    }

    public PageResult<ReferenceOption> lookup(Long targetFormId, String keyword, PageQuery query) {
        FormSchema targetSchema = schemaService.getCurrentSchema(targetFormId);
        var fields = schemaService.listFieldsBySchemaId(targetSchema.getId());

        if (targetSchema.getTargetTable() != null) {
            return lookupMapped(targetSchema, fields, keyword, query);
        } else {
            return lookupUnmapped(targetSchema, fields, keyword, query);
        }
    }

    /** Find the field marked as the display field (caller provides referenceDisplayField via field.config). */
    private FormFieldDefVO findDisplayField(List<FormFieldDefVO> fields, String displayFieldCode) {
        return fields.stream()
                .filter(f -> f.code().equals(displayFieldCode))
                .findFirst()
                .orElseThrow(() -> new BizException(ErrorCode.FORM_FIELD_NOT_FOUND,
                        "Display field not found: " + displayFieldCode));
    }

    private PageResult<ReferenceOption> lookupMapped(FormSchema target, List<FormFieldDefVO> fields,
                                                     String keyword, PageQuery query) {
        // For MVP: use the first 'text' field as display, or the field marked display
        // (caller's referenceDisplayField would be passed in via a more complete API; here we use a heuristic)
        FormFieldDefVO displayField = fields.stream()
                .filter(f -> "text".equals(f.type()) && !Boolean.TRUE.equals(f.isLinkField()))
                .findFirst()
                .orElse(fields.get(0));
        String col = displayField.targetColumn();
        if (col == null) throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "Display field has no target_column");

        StringBuilder sql = new StringBuilder("SELECT id, ")
                .append(col).append(" AS display FROM ")
                .append(target.getTargetTable())
                .append(" WHERE deleted = 0");
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND ").append(col).append(" ILIKE ?");
            params.add("%" + keyword + "%");
        }
        sql.append(" ORDER BY id DESC LIMIT ? OFFSET ?");
        params.add(query.pageSize());
        params.add((query.pageNum() - 1) * query.pageSize());

        final String displayCol = col;
        List<ReferenceOption> records = jdbcTemplate.query(sql.toString(), (rs, rn) ->
                new ReferenceOption(rs.getLong("id"), rs.getString("display")),
                params.toArray());
        long total = countMapped(target.getTargetTable(), col, keyword);
        return PageResult.of(records, total, query.pageNum(), query.pageSize());
    }

    private long countMapped(String table, String col, String keyword) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM ")
                .append(table).append(" WHERE deleted = 0");
        Object[] args;
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND ").append(col).append(" ILIKE ?");
            args = new Object[]{"%" + keyword + "%"};
        } else {
            args = new Object[0];
        }
        Long c = jdbcTemplate.queryForObject(sql.toString(), Long.class, args);
        return c == null ? 0L : c;
    }

    private PageResult<ReferenceOption> lookupUnmapped(FormSchema target, List<FormFieldDefVO> fields,
                                                       String keyword, PageQuery query) {
        FormFieldDefVO displayField = fields.stream()
                .filter(f -> "text".equals(f.type()))
                .findFirst()
                .orElse(fields.get(0));
        String key = displayField.code();

        StringBuilder sql = new StringBuilder("SELECT id, data->>? AS display FROM form_data WHERE form_id = ? AND deleted = 0");
        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(key);
        params.add(target.getFormId());
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND data->>? ILIKE ?");
            params.add(key);
            params.add("%" + keyword + "%");
        }
        sql.append(" ORDER BY id DESC LIMIT ? OFFSET ?");
        params.add(query.pageSize());
        params.add((query.pageNum() - 1) * query.pageSize());

        final String displayKey = key;
        List<ReferenceOption> records = jdbcTemplate.query(sql.toString(), (rs, rn) ->
                new ReferenceOption(rs.getLong("id"), rs.getString("display")),
                params.toArray());
        long total = countUnmapped(target.getFormId(), key, keyword);
        return PageResult.of(records, total, query.pageNum(), query.pageSize());
    }

    private long countUnmapped(Long formId, String key, String keyword) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM form_data WHERE form_id = ? AND deleted = 0");
        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(formId);
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND data->>? ILIKE ?");
            params.add(key);
            params.add("%" + keyword + "%");
        }
        Long c = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return c == null ? 0L : c;
    }
}
