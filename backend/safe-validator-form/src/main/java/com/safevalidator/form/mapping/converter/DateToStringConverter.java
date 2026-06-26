package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Component
public class DateToStringConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("date", "datetime", "text"); }
    @Override public Set<String> targetTypes() { return Set.of("varchar", "text"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        if (value instanceof LocalDate d) return d.format(DateTimeFormatter.ISO_LOCAL_DATE);
        if (value instanceof LocalDateTime dt) return dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        return value.toString();
    }
}
