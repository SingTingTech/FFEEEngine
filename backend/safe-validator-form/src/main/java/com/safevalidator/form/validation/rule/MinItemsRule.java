package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Set;

@Component
public class MinItemsRule implements ValidationRule {

    @Override public String name() { return "minItems"; }
    @Override public String label() { return "最少选项数"; }
    @Override public Set<String> applicableTypes() { return Set.of("multiselect"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (!(value instanceof Collection<?> c)) return null;
        int min = toInt(ruleConfig);
        if (c.size() < min) return ctx.fieldLabel() + "至少需要" + min + "项";
        return null;
    }

    private int toInt(Object cfg) {
        if (cfg instanceof Number n) return n.intValue();
        if (cfg instanceof String s) return Integer.parseInt(s);
        throw new IllegalArgumentException("minItems requires a number");
    }
}