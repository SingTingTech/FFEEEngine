package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class SelectFieldType implements FieldType {

    @Override public String name() { return "select"; }
    @Override public String label() { return "单选"; }
    @Override public String description() { return "从预设选项中选择一个"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("options", "选项", "select-multi", true, List.of(), List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        return rawValue.toString();
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "inOptions");
    }
}
