package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class ReferenceFieldTypeTest {

    private final ReferenceFieldType type = new ReferenceFieldType();

    @Test
    void parsesLongId() {
        assertThat(type.parseValue(42L)).isEqualTo(42L);
    }

    @Test
    void parsesIntegerId() {
        assertThat(type.parseValue(100)).isEqualTo(100L);
    }

    @Test
    void parsesStringId() {
        assertThat(type.parseValue("123")).isEqualTo(123L);
    }

    @Test
    void invalidStringThrows() {
        assertThatThrownBy(() -> type.parseValue("not-a-number"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid reference id");
    }

    @Test
    void nullReturnsNull() {
        assertThat(type.parseValue(null)).isNull();
    }
}
