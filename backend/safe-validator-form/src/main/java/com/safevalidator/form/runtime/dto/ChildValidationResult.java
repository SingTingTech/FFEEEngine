package com.safevalidator.form.runtime.dto;

import com.safevalidator.form.schema.dto.FieldError;

import java.util.List;

public record ChildValidationResult(
        Long formId,
        Integer recordIndex,
        List<FieldError> fieldErrors
) {}