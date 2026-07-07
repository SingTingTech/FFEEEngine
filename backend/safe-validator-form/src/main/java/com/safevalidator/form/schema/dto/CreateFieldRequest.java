package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record CreateFieldRequest(
        @NotBlank @Size(max = 64) String code,
        @NotBlank @Size(max = 128) String name,
        @NotBlank @Size(max = 32) String type,
        Boolean required,
        String defaultValue,
        Integer sortOrder,
        Map<String, Object> config,
        Map<String, Object> validation,
        @Size(max = 128) String targetColumn,
        // Client-side id (e.g. "tmp-0" for a new section, or a server-issued Long string
        // when editing an existing form). The backend remaps to the new section id.
        @Size(max = 64) String sectionId
) {}
