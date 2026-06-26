package com.safevalidator.form.validation;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class ValidationRuleRegistryTest {

    @Test
    void loadsAllBuiltinRules() {
        ValidationRuleRegistry reg = new ValidationRuleRegistry(List.of(
                new com.safevalidator.form.validation.rule.RequiredRule(),
                new com.safevalidator.form.validation.rule.MinLengthRule(),
                new com.safevalidator.form.validation.rule.MaxLengthRule(),
                new com.safevalidator.form.validation.rule.MinRule(),
                new com.safevalidator.form.validation.rule.MaxRule(),
                new com.safevalidator.form.validation.rule.PatternRule(),
                new com.safevalidator.form.validation.rule.IntegerRule(),
                new com.safevalidator.form.validation.rule.InOptionsRule(),
                new com.safevalidator.form.validation.rule.MinItemsRule(),
                new com.safevalidator.form.validation.rule.MaxItemsRule()
        ));
        assertThat(reg.listAll()).hasSize(10);
    }

    @Test
    void unknownRuleThrows() {
        ValidationRuleRegistry reg = new ValidationRuleRegistry(List.of());
        assertThatThrownBy(() -> reg.get("nonexistent"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
