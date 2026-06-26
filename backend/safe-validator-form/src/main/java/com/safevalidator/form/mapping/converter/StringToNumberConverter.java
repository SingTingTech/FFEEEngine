package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

@Component
public class StringToNumberConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("text", "number"); }
    @Override public Set<String> targetTypes() { return Set.of("int2", "int4", "int8", "numeric", "float4", "float8"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n;
        String s = value.toString().trim();
        if (s.isEmpty()) return null;
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Cannot convert '" + s + "' to number", e);
        }
    }
}
