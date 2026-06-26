package com.safevalidator.form.mapping.engine;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.exception.BizException;
import com.safevalidator.form.mapping.converter.TypeConverterRegistry;
import com.safevalidator.form.mapping.dto.BuiltSql;
import com.safevalidator.form.mapping.dto.ColumnInfo;
import com.safevalidator.form.mapping.registry.ColumnIntrospector;
import com.safevalidator.form.schema.entity.FormFieldDef;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class MappingEngine {

    private final JdbcTemplate jdbcTemplate;
    private final TypeConverterRegistry converterRegistry;
    private final ColumnIntrospector columnIntrospector;

    public MappingEngine(JdbcTemplate jdbcTemplate, TypeConverterRegistry converterRegistry,
                         ColumnIntrospector columnIntrospector) {
        this.jdbcTemplate = jdbcTemplate;
        this.converterRegistry = converterRegistry;
        this.columnIntrospector = columnIntrospector;
    }

    /** Build INSERT SQL for a mapped form. */
    public BuiltSql buildInsert(String table, List<FormFieldDef> fields, Map<String, Object> data) {
        validateMapping(fields);
        Map<String, String> columnTypes = columnTypes(table);
        List<String> cols = new ArrayList<>();
        List<Object> vals = new ArrayList<>();
        for (FormFieldDef f : fields) {
            if (!data.containsKey(f.getCode())) continue;
            String col = f.getTargetColumn();
            if (col == null) continue;
            Object storageVal = converterRegistry.convert(f.getType(), columnTypes.getOrDefault(col, "varchar"), data.get(f.getCode()));
            cols.add(col);
            vals.add(storageVal);
        }
        if (cols.isEmpty()) {
            throw new BizException(ErrorCode.FORM_MAPPING_INVALID, "INSERT has no columns");
        }
        String placeholders = String.join(", ", cols.stream().map(c -> "?").collect(Collectors.toList()));
        String sql = "INSERT INTO " + table + " (" + String.join(", ", cols) + ") VALUES (" + placeholders + ")";
        return new BuiltSql(sql, vals);
    }

    /** Build UPDATE SQL for a mapped form. */
    public BuiltSql buildUpdate(String table, List<FormFieldDef> fields, Map<String, Object> data, Long recordId) {
        validateMapping(fields);
        Map<String, String> columnTypes = columnTypes(table);
        List<String> setParts = new ArrayList<>();
        List<Object> vals = new ArrayList<>();
        for (FormFieldDef f : fields) {
            if (!data.containsKey(f.getCode())) continue;
            String col = f.getTargetColumn();
            if (col == null) continue;
            Object storageVal = converterRegistry.convert(f.getType(), columnTypes.getOrDefault(col, "varchar"), data.get(f.getCode()));
            setParts.add(col + " = ?");
            vals.add(storageVal);
        }
        vals.add(recordId);
        String sql = "UPDATE " + table + " SET " + String.join(", ", setParts) + " WHERE id = ?";
        return new BuiltSql(sql, vals);
    }

    /** Build SELECT SQL to fetch a single record by id. */
    public BuiltSql buildSelect(String table, Long recordId) {
        return new BuiltSql("SELECT * FROM " + table + " WHERE id = ? AND deleted = 0", List.of(recordId));
    }

    /** Build DELETE SQL (logical: UPDATE deleted=1). */
    public BuiltSql buildLogicalDelete(String table, Long recordId) {
        return new BuiltSql("UPDATE " + table + " SET deleted = 1 WHERE id = ?", List.of(recordId));
    }

    /** Build DELETE children by parent_id. */
    public BuiltSql buildDeleteChildren(String table, String linkingColumn, Object parentId) {
        return new BuiltSql("UPDATE " + table + " SET deleted = 1 WHERE " + linkingColumn + " = ?", List.of(parentId));
    }

    /** Build SELECT children by parent_id. */
    public BuiltSql buildSelectChildren(String table, String linkingColumn, Object parentId) {
        return new BuiltSql(
                "SELECT id, * FROM " + table + " WHERE " + linkingColumn + " = ? AND deleted = 0",
                List.of(parentId));
    }

    /** Build UPSERT lookup (for business key) for mapped table. */
    public List<Map<String, Object>> findByBusinessKeyMapped(String table, List<FormFieldDef> keyFields, Map<String, Object> data) {
        Map<String, String> columnTypes = columnTypes(table);
        StringBuilder where = new StringBuilder("deleted = 0");
        List<Object> params = new ArrayList<>();
        for (FormFieldDef f : keyFields) {
            where.append(" AND ").append(f.getTargetColumn()).append(" = ?");
            Object v = data.get(f.getCode());
            if (v != null) {
                v = converterRegistry.convert(f.getType(), columnTypes.getOrDefault(f.getTargetColumn(), "varchar"), v);
            }
            params.add(v);
        }
        String sql = "SELECT id FROM " + table + " WHERE " + where + " LIMIT 1";
        return jdbcTemplate.queryForList(sql, params.toArray());
    }

    /** Insert a row into a mapped table, return generated id. */
    public Long executeInsert(BuiltSql built) {
        return executeInsertAndReturnId(built);
    }

    private Long executeInsertAndReturnId(BuiltSql built) {
        org.springframework.jdbc.support.GeneratedKeyHolder holder = new org.springframework.jdbc.support.GeneratedKeyHolder();
        jdbcTemplate.update(conn -> {
            var ps = conn.prepareStatement(built.sql(), new String[]{"id"});
            for (int i = 0; i < built.params().size(); i++) {
                ps.setObject(i + 1, built.params().get(i));
            }
            return ps;
        }, holder);
        Number id = holder.getKey();
        if (id == null) throw new BizException(ErrorCode.SYSTEM_ERROR, "INSERT did not return id");
        return id.longValue();
    }

    public int executeUpdate(BuiltSql built) {
        return jdbcTemplate.update(built.sql(), built.params().toArray());
    }

    public List<Map<String, String>> queryForList(BuiltSql built) {
        return jdbcTemplate.query(built.sql(), (rs, rowNum) -> {
            Map<String, String> row = new HashMap<>();
            int colCount = rs.getMetaData().getColumnCount();
            for (int i = 1; i <= colCount; i++) {
                row.put(rs.getMetaData().getColumnName(i).toLowerCase(), rs.getString(i));
            }
            return row;
        }, built.params().toArray());
    }

    /** Convert all values from storage to display type using the field type registry. */
    public Map<String, Object> convertRowFromStorage(Map<String, String> row, List<FormFieldDef> fields) {
        Map<String, String> columnTypes = columnTypesForFields(fields, row);
        Map<String, Object> result = new HashMap<>();
        for (FormFieldDef f : fields) {
            String col = f.getTargetColumn();
            if (col == null) continue;
            String raw = row.get(col.toLowerCase());
            if (raw == null) continue;
            String storageType = columnTypes.getOrDefault(col, "varchar");
            try {
                Object converted = converterRegistry.convert(f.getType(), storageType, reverseForRead(f, raw));
                result.put(f.getCode(), converted);
            } catch (Exception e) {
                result.put(f.getCode(), raw);
            }
        }
        return result;
    }

    /** Read a form_data row, return its JSONB data as a map. */
    public Map<String, Object> readFormDataRow(Map<String, Object> dbRow) {
        Object data = dbRow.get("data");
        if (data == null) return Map.of();
        // JdbcTemplate returns PGobject as PGObject
        if (data instanceof org.postgresql.util.PGobject pg) {
            String json = pg.getValue();
            try {
                return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
            } catch (Exception e) {
                return Map.of();
            }
        }
        if (data instanceof Map) return (Map<String, Object>) data;
        return Map.of();
    }

    /** Validate fields have target_column. */
    private void validateMapping(List<FormFieldDef> fields) {
        for (FormFieldDef f : fields) {
            if (f.getTargetColumn() == null || f.getTargetColumn().isBlank()) {
                throw new BizException(ErrorCode.FORM_MAPPING_INVALID,
                        "字段未配置 targetColumn: " + f.getCode());
            }
        }
    }

    private Map<String, String> columnTypes(String table) {
        List<ColumnInfo> cols = columnIntrospector.listColumns(table);
        Map<String, String> result = new HashMap<>();
        for (ColumnInfo c : cols) result.put(c.name(), c.typeName());
        return result;
    }

    private Map<String, String> columnTypesForFields(List<FormFieldDef> fields, Map<String, String> row) {
        // For reads, derive types from the field metadata + a single sample row.
        // For MVP, just return based on the first non-null column we can infer from.
        // To keep simple, use field.type as a hint and 'varchar' as default.
        Map<String, String> result = new HashMap<>();
        for (FormFieldDef f : fields) {
            if (f.getTargetColumn() != null) result.put(f.getTargetColumn(), inferTypeFromValue(row.get(f.getTargetColumn().toLowerCase())));
        }
        return result;
    }

    private String inferTypeFromValue(String v) {
        if (v == null) return "varchar";
        // naive inference — production should use column metadata from introspector
        return "varchar";
    }

    private Object reverseForRead(FormFieldDef f, String raw) {
        // For reads, we have a string from the DB; pass it as-is to the converter
        return raw;
    }
}
