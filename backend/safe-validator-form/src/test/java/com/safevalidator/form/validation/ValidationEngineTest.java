package com.safevalidator.form.validation;

import com.safevalidator.form.mapping.type.FieldTypeRegistry;
import com.safevalidator.form.mapping.type.TextFieldType;
import com.safevalidator.form.mapping.type.NumberFieldType;
import com.safevalidator.form.runtime.dto.FormSubmitRequest;
import com.safevalidator.form.runtime.dto.FormValidationResult;
import com.safevalidator.form.schema.dto.FieldError;
import com.safevalidator.form.schema.dto.FormFieldDefVO;
import com.safevalidator.form.validation.rule.*;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class ValidationEngineTest {

    private final ValidationRuleRegistry ruleReg = new ValidationRuleRegistry(List.of(
            new RequiredRule(), new MinLengthRule(), new MaxLengthRule(),
            new PatternRule(), new MinRule(), new MaxRule()
    ));
    private final FieldTypeRegistry typeReg = new FieldTypeRegistry(List.of(
            new TextFieldType(), new NumberFieldType()
    ));
    private final ValidationEngine engine = new ValidationEngine(ruleReg, typeReg);

    @Test
    void validatesRequiredField() {
        FormFieldDefVO nameField = new FormFieldDefVO(
                1L, 100L, "name", "姓名", "text", true, null, 0,
                null, Map.of("required", true), null, null, false, null, null);

        List<FieldError> errors = engine.validateField(nameField, null);

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).code()).isEqualTo("required");
    }

    @Test
    void passesValidValue() {
        FormFieldDefVO nameField = new FormFieldDefVO(
                1L, 100L, "name", "姓名", "text", true, null, 0,
                null, Map.of("required", true, "minLength", 2, "maxLength", 50), null, null, false, null, null);

        List<FieldError> errors = engine.validateField(nameField, "张三");

        assertThat(errors).isEmpty();
    }

    @Test
    void catchesMinLengthViolation() {
        FormFieldDefVO nameField = new FormFieldDefVO(
                1L, 100L, "name", "姓名", "text", false, null, 0,
                null, Map.of("minLength", 5), null, null, false, null, null);

        List<FieldError> errors = engine.validateField(nameField, "abc");

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).code()).isEqualTo("minLength");
    }

    @Test
    void validatesWholeForm() {
        FormFieldDefVO nameField = new FormFieldDefVO(
                1L, 100L, "name", "姓名", "text", true, null, 0,
                null, Map.of("required", true), null, null, false, null, null);

        FormSubmitRequest req = new FormSubmitRequest(100L, Map.of("name", ""), null);
        FormValidationResult result = engine.validateForm(req, List.of(nameField), Map.of());

        assertThat(result.isOk()).isFalse();
        assertThat(result.fieldErrors()).hasSize(1);
    }
}
