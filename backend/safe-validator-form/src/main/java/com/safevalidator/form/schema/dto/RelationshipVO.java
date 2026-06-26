package com.safevalidator.form.schema.dto;

import java.time.LocalDateTime;

public record RelationshipVO(
        Long id,
        Long schemaId,
        Long parentFormId,
        Long childFormId,
        String relationType,
        String parentLinkField,
        String childLinkField,
        String onDelete,
        LocalDateTime createTime
) {}