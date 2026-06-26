package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class StringToBooleanConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("text", "boolean"); }
    @Override public Set<String> targetTypes() { return Set.of("bool", "varchar"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b;
        String s = value.toString().trim().toLowerCase();
        return switch (s) {
            case "true", "1", "yes", "on" -> true;
            case "false", "0", "no", "off" -> false;
            default -> throw new IllegalArgumentException("Cannot convert '" + s + "' to boolean");
        };
    }
}
