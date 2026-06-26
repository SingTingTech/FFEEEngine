package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class RequiredRule implements ValidationRule {

    @Override public String name() { return "required"; }
    @Override public String label() { return "必填"; }
    @Override public Set<String> applicableTypes() { return Set.of(); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        boolean required = ruleConfig == null || Boolean.TRUE.equals(ruleConfig);
        if (!required) return null;
        if (value == null) return ctx.fieldLabel() + "不能为空";
        if (value instanceof String s && s.trim().isEmpty()) return ctx.fieldLabel() + "不能为空";
        if (value instanceof java.util.Collection<?> c && c.isEmpty()) return ctx.fieldLabel() + "不能为空";
        return null;
    }
}