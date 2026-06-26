package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.Size;

import java.util.Map;

public record UpdateFieldRequest(
        @Size(max = 128) String name,
        String type,
        Boolean required,
        String defaultValue,
        Integer sortOrder,
        Map<String, Object> config,
        Map<String, Object> validation,
        @Size(max = 128) String targetColumn
) {}