package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class TextFieldTypeTest {

    private final TextFieldType type = new TextFieldType();

    @Test
    void parsesStringValue() {
        assertThat(type.parseValue("hello")).isEqualTo("hello");
    }

    @Test
    void handlesNull() {
        assertThat(type.parseValue(null)).isNull();
    }

    @Test
    void toStringCoercesNonString() {
        assertThat(type.parseValue(123)).isEqualTo("123");
    }

    @Test
    void applicableRulesIncludesRequiredAndLength() {
        assertThat(type.applicableRules())
                .contains("required", "minLength", "maxLength", "pattern");
    }
}
