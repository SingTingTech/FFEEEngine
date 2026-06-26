package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Set;

@Component
public class InOptionsRule implements ValidationRule {

    @Override public String name() { return "inOptions"; }
    @Override public String label() { return "必须在选项列表内"; }
    @Override public Set<String> applicableTypes() { return Set.of("select", "multiselect"); }

    @Override
    @SuppressWarnings("unchecked")
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;
        if (!(ruleConfig instanceof Collection<?> opts)) {
            throw new IllegalArgumentException("inOptions requires a list of options");
        }
        Set<String> allowed = new java.util.HashSet<>();
        for (Object o : opts) {
            if (o != null) allowed.add(o.toString());
        }
        if (value instanceof Collection<?> vs) {
            for (Object v : vs) {
                if (v == null || !allowed.contains(v.toString())) {
                    return ctx.fieldLabel() + "包含不允许的选项";
                }
            }
            return null;
        }
        return allowed.contains(value.toString()) ? null
                : ctx.fieldLabel() + "值不在允许的选项中";
    }
}