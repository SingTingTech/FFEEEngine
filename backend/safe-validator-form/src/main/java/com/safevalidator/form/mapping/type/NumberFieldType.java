package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Component
public class NumberFieldType implements FieldType {

    @Override public String name() { return "number"; }
    @Override public String label() { return "数字"; }
    @Override public String description() { return "整数或小数"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("precision", "总位数", "number", false, 18, List.of()),
                new ConfigSchema.ConfigField("scale", "小数位", "number", false, 2, List.of()),
                new ConfigSchema.ConfigField("integer", "仅整数", "boolean", false, false, List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Number n) return n;
        if (rawValue instanceof String s) {
            if (s.isBlank()) return null;
            try {
                return new BigDecimal(s.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid number: " + s);
            }
        }
        throw new IllegalArgumentException("Cannot parse number from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "min", "max", "integer");
    }
}
