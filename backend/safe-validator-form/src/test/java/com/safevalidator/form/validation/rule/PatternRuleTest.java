package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class PatternRuleTest {

    private final PatternRule rule = new PatternRule();
    private final FieldContext ctx = new FieldContext("text", "code", "名称", null);

    @Test
    void matchesRegex() {
        assertThat(rule.validate("abc123", "^[a-z0-9]+$", ctx)).isNull();
    }

    @Test
    void failsMismatch() {
        assertThat(rule.validate("ABC", "^[a-z]+$", ctx)).contains("格式不正确");
    }

    @Test
    void nullValueSkipped() {
        assertThat(rule.validate(null, "^[a-z]+$", ctx)).isNull();
    }
}
