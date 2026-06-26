package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Set;

/** Converts any value to JSONB by serializing to JSON. */
@Component
public class JsonNodeConverter implements TypeConverter {

    private final ObjectMapper objectMapper;

    public JsonNodeConverter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override public Set<String> sourceTypes() { return Set.of("*"); }
    @Override public Set<String> targetTypes() { return Set.of("jsonb"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.valueToTree(value);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot convert to JSON: " + value, e);
        }
    }
}
