package com.safevalidator.form.mapping.registry;

import com.safevalidator.form.mapping.dto.ColumnInfo;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

/**
 * Introspects PostgreSQL user tables and columns.
 * Excludes system schemas (pg_catalog, information_schema).
 */
@Component
public class ColumnIntrospector {

    private final DataSource dataSource;

    public ColumnIntrospector(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public List<String> listUserTables() {
        List<String> tables = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData md = conn.getMetaData();
            try (ResultSet rs = md.getTables(null, "public", null, new String[]{"TABLE"})) {
                while (rs.next()) {
                    String name = rs.getString("TABLE_NAME");
                    if (name != null && !name.startsWith("_")) {
                        tables.add(name);
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to list user tables", e);
        }
        return tables;
    }

    public List<ColumnInfo> listColumns(String tableName) {
        List<ColumnInfo> columns = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData md = conn.getMetaData();
            try (ResultSet rs = md.getColumns(null, "public", tableName, null)) {
                while (rs.next()) {
                    String name = rs.getString("COLUMN_NAME");
                    int jdbcType = rs.getInt("DATA_TYPE");
                    String typeName = rs.getString("TYPE_NAME");
                    boolean nullable = "YES".equals(rs.getString("IS_NULLABLE"));
                    int size = rs.getInt("COLUMN_SIZE");
                    Integer sizeOrNull = rs.wasNull() ? null : size;
                    columns.add(new ColumnInfo(name, jdbcType, typeName.toLowerCase(), nullable, sizeOrNull));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to list columns for " + tableName, e);
        }
        return columns;
    }
}
