package com.safevalidator.form.schema.dto;

import java.util.List;

public record UpdateSchemaRequest(
        String name,
        String description,
        List<CreateFieldRequest> fields,
        List<CreateRelationshipRequest> relationships,
        List<CreateSectionRequest> sections
) {}
