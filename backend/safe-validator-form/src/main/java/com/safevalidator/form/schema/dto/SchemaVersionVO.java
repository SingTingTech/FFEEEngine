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