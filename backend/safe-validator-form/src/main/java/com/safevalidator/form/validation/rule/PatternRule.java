package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.regex.Pattern;

@Component
public class PatternRule implements ValidationRule {

    @Override public String name() { return "pattern"; }
    @Override public String label() { return "正则表达式"; }
    @Override public Set<String> applicableTypes() { return Set.of("text", "longtext"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;
        if (!(value instanceof String s)) return null;
        if (ruleConfig == null) throw new IllegalArgumentException("pattern rule requires a regex");
        Pattern p = Pattern.compile(ruleConfig.toString());
        if (!p.matcher(s).matches()) {
            return ctx.fieldLabel() + "格式不正确";
        }
        return null;
    }
}