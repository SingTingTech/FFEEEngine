package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class MaxLengthRule implements ValidationRule {

    @Override public String name() { return "maxLength"; }
    @Override public String label() { return "最大长度"; }
    @Override public Set<String> applicableTypes() { return Set.of("text", "longtext"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;
        if (!(value instanceof String s)) return null;
        int max = toInt(ruleConfig);
        if (s.length() > max) {
            return ctx.fieldLabel() + "长度不能超过" + max;
        }
        return null;
    }

    private int toInt(Object cfg) {
        if (cfg instanceof Number n) return n.intValue();
        if (cfg instanceof String s) return Integer.parseInt(s);
        throw new IllegalArgumentException("maxLength requires a number, got: " + cfg);
    }
}