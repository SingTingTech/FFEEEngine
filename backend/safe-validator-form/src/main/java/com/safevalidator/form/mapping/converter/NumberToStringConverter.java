package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class NumberToStringConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("number", "text"); }
    @Override public Set<String> targetTypes() { return Set.of("varchar", "text"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        return value.toString();
    }
}
