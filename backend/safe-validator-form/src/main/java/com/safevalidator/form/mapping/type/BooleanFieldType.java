package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class BooleanFieldType implements FieldType {

    @Override public String name() { return "boolean"; }
    @Override public String label() { return "布尔"; }
    @Override public String description() { return "是/否开关"; }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Boolean b) return b;
        if (rawValue instanceof String s) {
            return switch (s.toLowerCase()) {
                case "true", "1", "yes", "on" -> true;
                case "false", "0", "no", "off" -> false;
                default -> throw new IllegalArgumentException("Invalid boolean: " + s);
            };
        }
        if (rawValue instanceof Number n) return n.intValue() != 0;
        throw new IllegalArgumentException("Cannot parse boolean from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required");
    }
}
