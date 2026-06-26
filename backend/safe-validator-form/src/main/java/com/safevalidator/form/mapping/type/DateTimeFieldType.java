package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;

@Component
public class DateTimeFieldType implements FieldType {

    @Override public String name() { return "datetime"; }
    @Override public String label() { return "日期时间"; }
    @Override public String description() { return "年-月-日 时:分:秒"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("format", "格式", "string", false, "yyyy-MM-dd HH:mm:ss", List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof LocalDateTime dt) return dt;
        if (rawValue instanceof String s) {
            try {
                // try ISO_LOCAL_DATE_TIME first
                return LocalDateTime.parse(s.trim(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (DateTimeParseException e1) {
                try {
                    // fall back to "yyyy-MM-dd HH:mm:ss"
                    return LocalDateTime.parse(s.trim(),
                            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                } catch (DateTimeParseException e2) {
                    throw new IllegalArgumentException("Invalid datetime: " + s);
                }
            }
        }
        throw new IllegalArgumentException("Cannot parse datetime from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minDate", "maxDate");
    }
}
