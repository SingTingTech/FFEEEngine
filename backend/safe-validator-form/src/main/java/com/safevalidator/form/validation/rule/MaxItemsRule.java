package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Set;

@Component
public class MaxItemsRule implements ValidationRule {

    @Override public String name() { return "maxItems"; }
    @Override public String label() { return "最多选项数"; }
    @Override public Set<String> applicableTypes() { return Set.of("multiselect"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (!(value instanceof Collection<?> c)) return null;
        int max = toInt(ruleConfig);
        if (c.size() > max) return ctx.fieldLabel() + "最多" + max + "项";
        return null;
    }

    private int toInt(Object cfg) {
        if (cfg instanceof Number n) return n.intValue();
        if (cfg instanceof String s) return Integer.parseInt(s);
        throw new IllegalArgumentException("maxItems requires a number");
    }
}