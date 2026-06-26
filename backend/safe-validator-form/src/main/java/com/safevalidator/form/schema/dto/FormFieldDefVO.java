package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record FormFieldDefVO(
        Long id,
        Long schemaId,
        String code,
        String name,
        String type,
        Boolean required,
        String defaultValue,
        Integer sortOrder,
        Map<String, Object> config,
        Map<String, Object> validation,
        String targetColumn,
        Long sectionId,
        Boolean isLinkField,
        LocalDateTime createTime,
        LocalDateTime updateTime
) {}
