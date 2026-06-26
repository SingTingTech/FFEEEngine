package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SchemaDetailVO(
        Long formId,
        Integer version,
        Long schemaId,
        String name,
        String description,
        String targetTable,
        Boolean isCurrent,
        LocalDateTime createTime,
        List<FormFieldDefVO> fields,
        List<RelationshipVO> relationships,
        List<SectionVO> sections
) {}
