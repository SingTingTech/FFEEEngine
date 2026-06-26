package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class ReferenceFieldType implements FieldType {

    @Override public String name() { return "reference"; }
    @Override public String label() { return "引用"; }
    @Override public String description() { return "引用其他表单的某条记录"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("referenceFormId", "目标表单 ID", "number", true, null, List.of()),
                new ConfigSchema.ConfigField("referenceDisplayField", "显示字段 code", "string", true, null, List.of()),
                new ConfigSchema.ConfigField("referenceStorageAs", "存储类型", "select", false, "bigint",
                        List.of(
                                new ConfigSchema.Option("BIGINT", "bigint"),
                                new ConfigSchema.Option("VARCHAR", "varchar")
                        ))
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Number n) return n.longValue();
        if (rawValue instanceof String s) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid reference id: " + s);
            }
        }
        throw new IllegalArgumentException("Reference must be a number/string id, got: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "referenceExists");
    }
}
