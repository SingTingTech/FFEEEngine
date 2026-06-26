package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class MultiselectToJsonbConverter implements TypeConverter {

    private final ObjectMapper objectMapper;

    public MultiselectToJsonbConverter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override public Set<String> sourceTypes() { return Set.of("multiselect", "text"); }
    @Override public Set<String> targetTypes() { return Set.of("jsonb", "varchar", "text"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof List<?> list) {
            try {
                return objectMapper.valueToTree(list);
            } catch (Exception e) {
                throw new IllegalArgumentException("Cannot convert list to JSONB", e);
            }
        }
        // wrap single value in list
        try {
            return objectMapper.valueToTree(List.of(value));
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot convert to JSONB list", e);
        }
    }
}
