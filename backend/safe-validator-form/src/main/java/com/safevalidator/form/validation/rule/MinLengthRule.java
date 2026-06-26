package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class MinLengthRule implements ValidationRule {

    @Override public String name() { return "minLength"; }
    @Override public String label() { return "最小长度"; }
    @Override public Set<String> applicableTypes() { return Set.of("text", "longtext"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;     // handled by required
        if (!(value instanceof String s)) return null;
        int min = toInt(ruleConfig);
        if (s.length() < min) {
            return ctx.fieldLabel() + "长度不能小于" + min;
        }
        return null;
    }

    private int toInt(Object cfg) {
        if (cfg instanceof Number n) return n.intValue();
        if (cfg instanceof String s) return Integer.parseInt(s);
        throw new IllegalArgumentException("minLength requires a number, got: " + cfg);
    }
}