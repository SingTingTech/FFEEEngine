package com.safevalidator.form.validation;

/** Context passed to validation rules. */
public record FieldContext(
        String fieldType,            // display type from FieldType.name()
        String fieldCode,
        String fieldLabel,
        Object fieldConfig          // the field's config map (may be null)
) {}