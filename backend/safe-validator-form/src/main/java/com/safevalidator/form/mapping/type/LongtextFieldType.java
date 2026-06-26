package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class LongtextFieldType implements FieldType {

    @Override public String name() { return "longtext"; }
    @Override public String label() { return "长文本"; }
    @Override public String description() { return "多行文本"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("rows", "行数", "number", false, 4, List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        return rawValue.toString();
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minLength", "maxLength");
    }
}
