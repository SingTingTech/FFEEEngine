package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

class NumberFieldTypeTest {

    private final NumberFieldType type = new NumberFieldType();

    @Test
    void parsesInteger() {
        assertThat(type.parseValue(42)).isEqualTo(42);
    }

    @Test
    void parsesDecimalString() {
        Object result = type.parseValue("3.14");
        assertThat(result).isInstanceOf(BigDecimal.class);
        assertThat(((BigDecimal) result).doubleValue()).isEqualTo(3.14);
    }

    @Test
    void invalidStringThrows() {
        assertThatThrownBy(() -> type.parseValue("not a number"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid number");
    }

    @Test
    void blankStringReturnsNull() {
        assertThat(type.parseValue("   ")).isNull();
    }
}
