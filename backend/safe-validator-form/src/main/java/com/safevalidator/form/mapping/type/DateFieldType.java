package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;

@Component
public class DateFieldType implements FieldType {

    @Override public String name() { return "date"; }
    @Override public String label() { return "日期"; }
    @Override public String description() { return "年-月-日"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("format", "格式", "string", false, "yyyy-MM-dd", List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof LocalDate d) return d;
        if (rawValue instanceof String s) {
            try {
                return LocalDate.parse(s.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid date: " + s + " (expected yyyy-MM-dd)");
            }
        }
        throw new IllegalArgumentException("Cannot parse date from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minDate", "maxDate");
    }
}
