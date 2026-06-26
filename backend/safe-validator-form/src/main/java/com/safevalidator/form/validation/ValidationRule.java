package com.safevalidator.form.validation;

import java.util.Set;

public interface ValidationRule {

    /** Unique identifier — referenced in form_field_def.validation JSONB */
    String name();

    String label();

    /** Which display field types this rule applies to. Empty set = all types. */
    Set<String> applicableTypes();

    /**
     * Validate the value.
     *
     * @param value       the value to validate
     * @param ruleConfig  the rule-specific configuration from form_field_def.validation
     *                    (e.g. for "minLength", this is the minimum length number)
     * @param ctx         field context
     * @return null if valid, otherwise the error message
     */
    String validate(Object value, Object ruleConfig, FieldContext ctx);
}