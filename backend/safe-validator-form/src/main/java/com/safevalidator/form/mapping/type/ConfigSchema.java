package com.safevalidator.form.mapping.type;

import java.util.List;

public record ConfigSchema(List<ConfigField> fields) {
    public static ConfigSchema empty() {
        return new ConfigSchema(List.of());
    }

    public record ConfigField(
            String name,
            String label,
            String type,        // "string" | "number" | "boolean" | "select" | "select-multi"
            boolean required,
            Object defaultValue,
            List<Option> options        // for select type
    ) {}

    public record Option(String label, Object value) {}
}
