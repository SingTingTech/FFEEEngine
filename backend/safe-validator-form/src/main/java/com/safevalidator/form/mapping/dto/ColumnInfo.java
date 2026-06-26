package com.safevalidator.form.mapping.dto;

public record ColumnInfo(
        String name,
        int jdbcType,
        String typeName,        // "varchar", "int4", "numeric", "date", "jsonb", "bool"...
        boolean nullable,
        Integer size
) {}