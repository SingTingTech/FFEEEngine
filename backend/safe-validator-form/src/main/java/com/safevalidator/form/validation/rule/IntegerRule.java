package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

@Component
public class IntegerRule implements ValidationRule {

    @Override public String name() { return "integer"; }
    @Override public String label() { return "必须为整数"; }
    @Override public Set<String> applicableTypes() { return Set.of("number"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;
        if (!Boolean.TRUE.equals(ruleConfig)) return null;
        if (value instanceof BigDecimal bd) {
            if (bd.scale() <= 0 || bd.signum() == 0 || bd.remainder(BigDecimal.ONE).signum() == 0) {
                return null;
            }
            return ctx.fieldLabel() + "必须为整数";
        }
        if (value instanceof Number n) {
            return n.doubleValue() == Math.floor(n.doubleValue()) ? null
                    : ctx.fieldLabel() + "必须为整数";
        }
        return null;
    }
}