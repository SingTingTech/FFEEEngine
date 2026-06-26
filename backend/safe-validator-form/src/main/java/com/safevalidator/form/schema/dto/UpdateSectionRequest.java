package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.Size;

public record UpdateSectionRequest(
        @Size(max = 128) String name,
        @Size(max = 512) String description,
        Integer sortOrder
) {}
