package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Component
public class StringToDateConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("text", "date", "datetime"); }
    @Override public Set<String> targetTypes() { return Set.of("date", "timestamp"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate || value instanceof LocalDateTime) return value;
        String s = value.toString().trim();
        try {
            // If string is ISO date-time, truncate to date
            if (s.length() > 10 && s.charAt(10) == 'T' || s.length() > 10 && s.charAt(10) == ' ') {
                return LocalDateTime.parse(s.replace(' ', 'T'), DateTimeFormatter.ISO_LOCAL_DATE_TIME).toLocalDate();
            }
            return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot convert '" + s + "' to date", e);
        }
    }
}
