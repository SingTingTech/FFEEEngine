package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class FieldTypeRegistryTest {

    @Test
    void registryLoadsAllBuiltinTypes() {
        FieldTypeRegistry registry = new FieldTypeRegistry(List.of(
                new TextFieldType(),
                new NumberFieldType(),
                new ReferenceFieldType()
        ));

        assertThat(registry.listAll()).hasSize(3);
        assertThat(registry.get("text").name()).isEqualTo("text");
        assertThat(registry.get("number").name()).isEqualTo("number");
        assertThat(registry.get("reference").name()).isEqualTo("reference");
    }

    @Test
    void getUnknownTypeThrows() {
        FieldTypeRegistry registry = new FieldTypeRegistry(List.of(new TextFieldType()));
        assertThatThrownBy(() -> registry.get("nonexistent"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown field type");
    }

    @Test
    void findReturnsOptional() {
        FieldTypeRegistry registry = new FieldTypeRegistry(List.of(new TextFieldType()));
        assertThat(registry.find("text")).isPresent();
        assertThat(registry.find("missing")).isEmpty();
    }
}
