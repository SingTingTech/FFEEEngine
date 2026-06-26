package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

@Component
public class MultiselectFieldType implements FieldType {

    @Override public String name() { return "multiselect"; }
    @Override public String label() { return "多选"; }
    @Override public String description() { return "从预设选项中选择多个"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("options", "选项", "select-multi", true, List.of(), List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Collection<?> c) {
            List<String> result = new ArrayList<>();
            for (Object o : c) {
                if (o == null) continue;
                result.add(o.toString());
            }
            return result;
        }
        throw new IllegalArgumentException("Expected list for multiselect, got: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minItems", "maxItems");
    }
}
