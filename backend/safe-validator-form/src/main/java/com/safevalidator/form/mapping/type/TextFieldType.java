package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class TextFieldType implements FieldType {

    @Override public String name() { return "text"; }
    @Override public String label() { return "文本"; }
    @Override public String description() { return "短文本，单行输入"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("maxLength", "最大长度", "number", false, 255, List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        return rawValue.toString();
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minLength", "maxLength", "pattern");
    }
}
