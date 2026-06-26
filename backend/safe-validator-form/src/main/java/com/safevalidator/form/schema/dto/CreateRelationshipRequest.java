package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRelationshipRequest(
        @NotNull Long parentFormId,
        @NotNull Long childFormId,
        @NotBlank String relationType,        // ONE_TO_ONE | ONE_TO_MANY
        String parentLinkField,
        @NotBlank String childLinkField,
        String onDelete                      // CASCADE | SET_NULL | RESTRICT (default CASCADE)
) {}