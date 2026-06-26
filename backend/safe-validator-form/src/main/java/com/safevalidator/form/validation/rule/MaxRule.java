package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Component
public class MaxRule implements ValidationRule {

    @Override public String name() { return "max"; }
    @Override public String label() { return "最大值"; }
    @Override public Set<String> applicableTypes() { return Set.of("number", "date", "datetime"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;
        int cmp = compareTo(value, ruleConfig);
        if (cmp > 0) {
            return ctx.fieldLabel() + "不能大于" + ruleConfig;
        }
        return null;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private int compareTo(Object value, Object limit) {
        if (value instanceof BigDecimal v && limit instanceof BigDecimal l) return v.compareTo(l);
        if (value instanceof Number v && limit instanceof Number l) {
            return new BigDecimal(v.toString()).compareTo(new BigDecimal(l.toString()));
        }
        if (value instanceof LocalDate v && limit instanceof LocalDate l) return v.compareTo(l);
        if (value instanceof LocalDateTime v && limit instanceof LocalDateTime l) return v.compareTo(l);
        throw new IllegalArgumentException("max: unsupported types " + value.getClass() + " / " + limit.getClass());
    }
}