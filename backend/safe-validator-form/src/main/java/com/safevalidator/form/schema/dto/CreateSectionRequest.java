package com.safevalidator.form.schema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSectionRequest(
        // Optional client-side id (temp id like "tmp-0" or server id when editing).
        // Used to remap field.sectionId when persisting: the backend builds a
        // clientId -> newSectionId map and substitutes field.sectionId accordingly.
        @Size(max = 64) String id,
        @NotBlank @Size(max = 128) String name,
        @Size(max = 512) String description,
        Integer sortOrder
) {}
