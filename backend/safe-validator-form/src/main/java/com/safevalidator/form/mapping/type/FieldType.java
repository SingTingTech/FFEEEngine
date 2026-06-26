package com.safevalidator.form.mapping.type;

import java.util.Set;

public interface FieldType {

    /** Unique identifier — stored in form_field_def.type column */
    String name();

    /** Display label for the designer */
    String label();

    default String description() {
        return "";
    }

    /** Configuration schema (drives the designer's field-edit form) */
    default ConfigSchema configSchema() {
        return ConfigSchema.empty();
    }

    /** Parse raw user input into the canonical form for this type.
     *  Throws IllegalArgumentException on invalid input. */
    Object parseValue(Object rawValue);

    /** Convert display value to storage value (e.g. number → string for VARCHAR column).
     *  Default: passthrough. */
    default Object toStorageValue(Object displayValue, FieldTypeRegistry registry) {
        return displayValue;
    }

    /** Convert storage value back to display value.
     *  Default: passthrough. */
    default Object fromStorageValue(Object storageValue, FieldTypeRegistry registry) {
        return storageValue;
    }

    /** Validation rule names that apply to this type. */
    Set<String> applicableRules();
}
