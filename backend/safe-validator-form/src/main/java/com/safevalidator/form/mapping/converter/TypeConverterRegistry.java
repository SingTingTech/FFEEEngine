package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class TypeConverterRegistry {

    private final List<TypeConverter> converters;

    public TypeConverterRegistry(List<TypeConverter> converters) {
        this.converters = List.copyOf(converters);
    }

    /**
     * Find a converter that handles the given source→target pair.
     * Special rule: if source and target types match, returns the first matching converter
     * (typically PassthroughConverter).
     */
    public Optional<TypeConverter> find(String sourceType, String targetType) {
        for (TypeConverter c : converters) {
            boolean sourceMatches = c.sourceTypes().contains("*") || c.sourceTypes().contains(sourceType);
            boolean targetMatches = c.targetTypes().contains("*") || c.targetTypes().contains(targetType);
            if (sourceMatches && targetMatches) {
                return Optional.of(c);
            }
        }
        return Optional.empty();
    }

    public Object convert(String sourceType, String targetType, Object value) {
        if (value == null) return null;
        return find(sourceType, targetType)
                .orElseThrow(() -> new IllegalStateException(
                        "No converter found: " + sourceType + " -> " + targetType))
                .convert(value);
    }
}
