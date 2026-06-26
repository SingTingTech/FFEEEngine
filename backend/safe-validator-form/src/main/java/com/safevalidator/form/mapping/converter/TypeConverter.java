package com.safevalidator.form.mapping.converter;

import java.util.Set;

public interface TypeConverter {

    /** Source display types this converter handles */
    Set<String> sourceTypes();

    /** Target storage type names (e.g. "varchar", "int4", "jsonb") this converter produces */
    Set<String> targetTypes();

    /** Convert the value. Throws IllegalArgumentException on failure. */
    Object convert(Object value);
}
