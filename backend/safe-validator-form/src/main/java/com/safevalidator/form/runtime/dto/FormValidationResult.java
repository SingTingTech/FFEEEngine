package com.safevalidator.form.runtime.dto;

import com.safevalidator.form.schema.dto.FieldError;

import java.util.List;

public record FormValidationResult(
        List<FieldError> fieldErrors,
        List<ChildValidationResult> formErrors
) {
    public boolean isOk() { return fieldErrors.isEmpty() && formErrors.isEmpty(); }
}