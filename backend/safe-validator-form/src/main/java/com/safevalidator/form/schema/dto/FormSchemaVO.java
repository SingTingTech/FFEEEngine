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