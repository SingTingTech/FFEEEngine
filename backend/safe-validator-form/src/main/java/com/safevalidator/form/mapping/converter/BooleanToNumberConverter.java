package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class BooleanToNumberConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("boolean"); }
    @Override public Set<String> targetTypes() { return Set.of("int2", "int4", "varchar"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b ? 1 : 0;
        if (value instanceof Number n) return n;
        return value;
    }
}
