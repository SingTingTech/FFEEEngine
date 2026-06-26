package com.safevalidator.form.validation;

import com.safevalidator.form.mapping.type.FieldType;
import com.safevalidator.form.mapping.type.FieldTypeRegistry;
import com.safevalidator.form.runtime.dto.ChildSubmit;
import com.safevalidator.form.runtime.dto.ChildValidationResult;
import com.safevalidator.form.runtime.dto.FormSubmitRequest;
import com.safevalidator.form.runtime.dto.FormValidationResult;
import com.safevalidator.form.schema.dto.FieldError;
import com.safevalidator.form.schema.dto.FormFieldDefVO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class ValidationEngine {

    private final ValidationRuleRegistry ruleRegistry;
    private final FieldTypeRegistry typeRegistry;

    public ValidationEngine(ValidationRuleRegistry ruleRegistry, FieldTypeRegistry typeRegistry) {
        this.ruleRegistry = ruleRegistry;
        this.typeRegistry = typeRegistry;
    }

    public List<FieldError> validateField(FormFieldDefVO field, Object rawValue) {
        List<FieldError> errors = new ArrayList<>();
        if (field.validation() == null || field.validation().isEmpty()) {
            return errors;
        }

        FieldType fieldType;
        try {
            fieldType = typeRegistry.get(field.type());
        } catch (IllegalArgumentException e) {
            errors.add(new FieldError(field.code(), "type", "未知字段类型: " + field.type()));
            return errors;
        }

        Object parsed;
        try {
            parsed = rawValue == null ? null : fieldType.parseValue(rawValue);
        } catch (IllegalArgumentException e) {
            errors.add(new FieldError(field.code(), "format", field.name() + ": " + e.getMessage()));
            return errors;
        }

        FieldContext ctx = new FieldContext(fieldType.name(), field.code(), field.name(), field.config());
        for (Map.Entry<String, Object> e : field.validation().entrySet()) {
            String ruleName = e.getKey();
            Object ruleConfig = e.getValue();
            if (ruleName.endsWith("Message")) continue;
            ValidationRule rule;
            try {
                rule = ruleRegistry.get(ruleName);
            } catch (IllegalArgumentException ex) {
                errors.add(new FieldError(field.code(), "rule", "未知校验规则: " + ruleName));
                continue;
            }
            if (!rule.applicableTypes().isEmpty() && !rule.applicableTypes().contains(fieldType.name())) {
                continue;
            }
            String err = rule.validate(parsed, ruleConfig, ctx);
            if (err != null) {
                String msg = extractMessage(field.validation(), ruleName + "Message", err);
                errors.add(new FieldError(field.code(), ruleName, msg));
            }
        }

        return errors;
    }

    public FormValidationResult validateForm(FormSubmitRequest req, List<FormFieldDefVO> parentFields, Map<Long, List<FormFieldDefVO>> childFieldsByFormId) {
        List<FieldError> parentErrors = new ArrayList<>();
        if (req.data() != null) {
            for (FormFieldDefVO field : parentFields) {
                if (Boolean.TRUE.equals(field.isLinkField())) continue;
                parentErrors.addAll(validateField(field, req.data().get(field.code())));
            }
        }

        List<ChildValidationResult> childErrors = new ArrayList<>();
        if (req.children() != null) {
            for (int i = 0; i < req.children().size(); i++) {
                ChildSubmit child = req.children().get(i);
                List<FormFieldDefVO> cFields = childFieldsByFormId.get(child.formId());
                if (cFields == null) continue;
                List<FieldError> cErrs = new ArrayList<>();
                if (child.data() != null) {
                    for (FormFieldDefVO field : cFields) {
                        if (Boolean.TRUE.equals(field.isLinkField())) continue;
                        cErrs.addAll(validateField(field, child.data().get(field.code())));
                    }
                }
                if (!cErrs.isEmpty()) {
                    childErrors.add(new ChildValidationResult(child.formId(), i, cErrs));
                }
            }
        }

        return new FormValidationResult(parentErrors, childErrors);
    }

    private String extractMessage(Map<String, Object> validation, String key, String fallback) {
        Object v = validation.get(key);
        if (v instanceof String s && !s.isEmpty()) return s;
        return fallback;
    }
}
