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
