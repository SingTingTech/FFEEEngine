package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class RequiredRuleTest {

    private final RequiredRule rule = new RequiredRule();
    private final FieldContext ctx = new FieldContext("text", "code", "名称", null);

    @Test
    void nullValueFails() {
        assertThat(rule.validate(null, true, ctx)).contains("不能为空");
    }

    @Test
    void emptyStringFails() {
        assertThat(rule.validate("   ", true, ctx)).contains("不能为空");
    }

    @Test
    void nonEmptyPasses() {
        assertThat(rule.validate("hello", true, ctx)).isNull();
    }

    @Test
    void notRequiredPasses() {
        assertThat(rule.validate(null, false, ctx)).isNull();
    }

    @Test
    void emptyCollectionFails() {
        assertThat(rule.validate(java.util.List.of(), true, ctx)).contains("不能为空");
    }
}
