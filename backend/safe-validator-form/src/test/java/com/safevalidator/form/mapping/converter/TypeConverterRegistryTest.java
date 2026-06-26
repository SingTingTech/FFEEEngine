package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class TypeConverterRegistryTest {

    @Test
    void findsStringToDateConverter() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(
                new PassthroughConverter(),
                new StringToDateConverter()
        ));
        assertThat(registry.find("text", "date")).isPresent();
    }

    @Test
    void findsPassthroughForMatchingTypes() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(new PassthroughConverter()));
        assertThat(registry.find("text", "varchar")).isPresent();
    }

    @Test
    void convertNullReturnsNull() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(new PassthroughConverter()));
        assertThat(registry.convert("text", "varchar", null)).isNull();
    }

    @Test
    void convertThrowsWhenNoConverterFound() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(new PassthroughConverter() {
            @Override public java.util.Set<String> targetTypes() { return java.util.Set.of("varchar"); }
        }));
        assertThatThrownBy(() -> registry.convert("text", "jsonb", "x"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No converter found");
    }
}
