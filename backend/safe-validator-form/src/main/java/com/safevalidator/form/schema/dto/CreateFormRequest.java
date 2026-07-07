package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFormRequest(
        @NotBlank @Size(max = 128) String name,
        @Size(max = 64) String code,
        String description,
        @Size(max = 128) String targetTable
) {}