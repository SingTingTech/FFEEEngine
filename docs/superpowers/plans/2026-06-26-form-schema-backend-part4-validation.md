# Part 4: Validation — Engine + 9 Rules

**Phase:** 4 of 7
**Tasks:** 4.1 – 4.5
**End state:** `ValidationEngine` runs all 9 rules against field values; registry auto-loads rules as Spring beans.

---

## Task 4.1: ValidationRule interface + registry + FieldContext

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/ValidationRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/ValidationRuleRegistry.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/FieldContext.java`

- [ ] **Step 1: Create FieldContext**

```java
package com.safevalidator.form.validation;

/** Context passed to validation rules. */
public record FieldContext(
        String fieldType,            // display type from FieldType.name()
        String fieldCode,
        String fieldLabel,
        Object fieldConfig          // the field's config map (may be null)
) {}
```

- [ ] **Step 2: Create ValidationRule interface**

```java
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
```

- [ ] **Step 3: Create ValidationRuleRegistry**

```java
package com.safevalidator.form.validation;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class ValidationRuleRegistry {

    private final Map<String, ValidationRule> rules = new LinkedHashMap<>();

    public ValidationRuleRegistry(List<ValidationRule> ruleBeans) {
        for (ValidationRule r : ruleBeans) {
            rules.put(r.name(), r);
        }
    }

    public ValidationRule get(String name) {
        ValidationRule r = rules.get(name);
        if (r == null) {
            throw new IllegalArgumentException("Unknown validation rule: " + name);
        }
        return r;
    }

    public Optional<ValidationRule> find(String name) {
        return Optional.ofNullable(rules.get(name));
    }

    public List<ValidationRule> listAll() {
        return List.copyOf(rules.values());
    }
}
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add ValidationRule interface and registry"
```

---

## Task 4.2: First 5 validation rules (required, minLength, maxLength, min, max)

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/RequiredRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/MinLengthRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/MaxLengthRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/MinRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/MaxRule.java`

- [ ] **Step 1: RequiredRule**

```java
package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class RequiredRule implements ValidationRule {

    @Override public String name() { return "required"; }
    @Override public String label() { return "必填"; }
    @Override public Set<String> applicableTypes() { return Set.of(); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        boolean required = ruleConfig == null || Boolean.TRUE.equals(ruleConfig);
        if (!required) return null;
        if (value == null) return ctx.fieldLabel() + "不能为空";
        if (value instanceof String s && s.trim().isEmpty()) return ctx.fieldLabel() + "不能为空";
        if (value instanceof java.util.Collection<?> c && c.isEmpty()) return ctx.fieldLabel() + "不能为空";
        return null;
    }
}
```

- [ ] **Step 2: MinLengthRule**

```java
package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class MinLengthRule implements ValidationRule {

    @Override public String name() { return "minLength"; }
    @Override public String label() { return "最小长度"; }
    @Override public Set<String> applicableTypes() { return Set.of("text", "longtext"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;     // handled by required
        if (!(value instanceof String s)) return null;
        int min = toInt(ruleConfig);
        if (s.length() < min) {
            return ctx.fieldLabel() + "长度不能小于" + min;
        }
        return null;
    }

    private int toInt(Object cfg) {
        if (cfg instanceof Number n) return n.intValue();
        if (cfg instanceof String s) return Integer.parseInt(s);
        throw new IllegalArgumentException("minLength requires a number, got: " + cfg);
    }
}
```

- [ ] **Step 3: MaxLengthRule**

```java
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
```

- [ ] **Step 4: MinRule**

```java
package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import com.safevalidator.form.validation.ValidationRule;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Component
public class MinRule implements ValidationRule {

    @Override public String name() { return "min"; }
    @Override public String label() { return "最小值"; }
    @Override public Set<String> applicableTypes() { return Set.of("number", "date", "datetime"); }

    @Override
    public String validate(Object value, Object ruleConfig, FieldContext ctx) {
        if (value == null) return null;
        int cmp = compareTo(value, ruleConfig);
        if (cmp < 0) {
            return ctx.fieldLabel() + "不能小于" + ruleConfig;
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
        throw new IllegalArgumentException("min: unsupported types " + value.getClass() + " / " + limit.getClass());
    }
}
```

- [ ] **Step 5: MaxRule**

```java
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
```

- [ ] **Step 6: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add 5 validation rules (required, minLength, maxLength, min, max)"
```

---

## Task 4.3: Remaining 4 rules (pattern, integer, inOptions, minItems/maxItems)

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/PatternRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/IntegerRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/InOptionsRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/MinItemsRule.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/rule/MaxItemsRule.java`

- [ ] **Step 1: PatternRule**

```java
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
```

- [ ] **Step 2: IntegerRule**

```java
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
```

- [ ] **Step 3: InOptionsRule**

```java
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
```

- [ ] **Step 4: MinItemsRule**

```java
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
```

- [ ] **Step 5: MaxItemsRule**

```java
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
```

- [ ] **Step 6: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add 4 more validation rules (pattern, integer, inOptions, items)"
```

---

## Task 4.4: ValidationEngine

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/validation/ValidationEngine.java`

- [ ] **Step 1: Create ValidationEngine**

```java
package com.safevalidator.form.validation;

import com.safevalidator.form.mapping.registry.FieldTypeRegistry;
import com.safevalidator.form.mapping.type.FieldType;
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

    /** Validate a single field against its validation JSONB config. */
    public List<FieldError> validateField(FormFieldDefVO field, Object rawValue) {
        List<FieldError> errors = new ArrayList<>();
        if (field.getValidation() == null || field.getValidation().isEmpty()) {
            return errors;
        }

        FieldType fieldType;
        try {
            fieldType = typeRegistry.get(field.getType());
        } catch (IllegalArgumentException e) {
            errors.add(new FieldError(field.getCode(), "type", "未知字段类型: " + field.getType()));
            return errors;
        }

        // 1. parse value through FieldType
        Object parsed;
        try {
            parsed = rawValue == null ? null : fieldType.parseValue(rawValue);
        } catch (IllegalArgumentException e) {
            errors.add(new FieldError(field.getCode(), "format", field.getName() + ": " + e.getMessage()));
            return errors;
        }

        // 2. iterate rules
        FieldContext ctx = new FieldContext(fieldType.name(), field.getCode(), field.getName(), field.getConfig());
        for (Map.Entry<String, Object> e : field.getValidation().entrySet()) {
            String ruleName = e.getKey();
            Object ruleConfig = e.getValue();
            // skip message fields
            if (ruleName.endsWith("Message")) continue;
            // skip required if it has a message key
            ValidationRule rule;
            try {
                rule = ruleRegistry.get(ruleName);
            } catch (IllegalArgumentException ex) {
                errors.add(new FieldError(field.getCode(), "rule",
                        "未知校验规则: " + ruleName));
                continue;
            }
            // check applicable
            if (!rule.applicableTypes().isEmpty() && !rule.applicableTypes().contains(fieldType.name())) {
                continue;
            }
            String err = rule.validate(parsed, ruleConfig, ctx);
            if (err != null) {
                String msg = extractMessage(field.getValidation(), ruleName + "Message", err);
                errors.add(new FieldError(field.getCode(), ruleName, msg));
            }
        }

        return errors;
    }

    /** Validate the whole form including children (1 level of children for MVP). */
    public FormValidationResult validateForm(FormSubmitRequest req, List<FormFieldDefVO> parentFields, Map<Long, List<FormFieldDefVO>> childFieldsByFormId) {
        List<FieldError> parentErrors = new ArrayList<>();
        if (req.data() != null) {
            for (FormFieldDefVO field : parentFields) {
                if (Boolean.TRUE.equals(field.getIsLinkField())) continue;  // skip auto-injected linking
                parentErrors.addAll(validateField(field, req.data().get(field.getCode())));
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
                        if (Boolean.TRUE.equals(field.getIsLinkField())) continue;
                        cErrs.addAll(validateField(field, child.data().get(field.getCode())));
                    }
                }
                if (!cErrs.isEmpty()) {
                    childErrors.add(new ChildValidationResult(child.formId(), i, cErrs));
                }
            }
        }

        return new FormValidationResult(parentErrors, childErrors);
    }

    @SuppressWarnings("unchecked")
    private String extractMessage(Map<String, Object> validation, String key, String fallback) {
        Object v = validation.get(key);
        if (v instanceof String s && !s.isEmpty()) return s;
        return fallback;
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add ValidationEngine with form-level + field-level validation"
```

---

## Task 4.5: Tests for validation rules + engine

**Files:**
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/validation/rule/RequiredRuleTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/validation/rule/PatternRuleTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/validation/ValidationRuleRegistryTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/validation/ValidationEngineTest.java`

- [ ] **Step 1: RequiredRuleTest**

```java
package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class RequiredRuleTest {

    private final RequiredRule rule = new RequiredRule();
    private final FieldContext ctx = new FieldContext("text", "code", "名称", null);

    @Test
    void nullValueFails() {
        assertThat(rule.validate(null, true, ctx)).contains("不能为空");
    }

    @Test
    void emptyStringFails() {
        assertThat(rule.validate("   ", true, ctx)).contains("不能为空");
    }

    @Test
    void nonEmptyPasses() {
        assertThat(rule.validate("hello", true, ctx)).isNull();
    }

    @Test
    void notRequiredPasses() {
        assertThat(rule.validate(null, false, ctx)).isNull();
    }

    @Test
    void emptyCollectionFails() {
        assertThat(rule.validate(java.util.List.of(), true, ctx)).contains("不能为空");
    }
}
```

- [ ] **Step 2: PatternRuleTest**

```java
package com.safevalidator.form.validation.rule;

import com.safevalidator.form.validation.FieldContext;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class PatternRuleTest {

    private final PatternRule rule = new PatternRule();
    private final FieldContext ctx = new FieldContext("text", "code", "名称", null);

    @Test
    void matchesRegex() {
        assertThat(rule.validate("abc123", "^[a-z0-9]+$", ctx)).isNull();
    }

    @Test
    void failsMismatch() {
        assertThat(rule.validate("ABC", "^[a-z]+$", ctx)).contains("格式不正确");
    }

    @Test
    void nullValueSkipped() {
        assertThat(rule.validate(null, "^[a-z]+$", ctx)).isNull();
    }
}
```

- [ ] **Step 3: ValidationRuleRegistryTest**

```java
package com.safevalidator.form.validation;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class ValidationRuleRegistryTest {

    @Test
    void loadsAllBuiltinRules() {
        ValidationRuleRegistry reg = new ValidationRuleRegistry(List.of(
                new com.safevalidator.form.validation.rule.RequiredRule(),
                new com.safevalidator.form.validation.rule.MinLengthRule(),
                new com.safevalidator.form.validation.rule.MaxLengthRule(),
                new com.safevalidator.form.validation.rule.MinRule(),
                new com.safevalidator.form.validation.rule.MaxRule(),
                new com.safevalidator.form.validation.rule.PatternRule(),
                new com.safevalidator.form.validation.rule.IntegerRule(),
                new com.safevalidator.form.validation.rule.InOptionsRule(),
                new com.safevalidator.form.validation.rule.MinItemsRule(),
                new com.safevalidator.form.validation.rule.MaxItemsRule()
        ));
        assertThat(reg.listAll()).hasSize(10);
    }

    @Test
    void unknownRuleThrows() {
        ValidationRuleRegistry reg = new ValidationRuleRegistry(List.of());
        assertThatThrownBy(() -> reg.get("nonexistent"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [ ] **Step 4: ValidationEngineTest**

```java
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
                null, Map.of("required", true), null, false, null, null);

        List<FieldError> errors = engine.validateField(nameField, null);

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).code()).isEqualTo("required");
    }

    @Test
    void passesValidValue() {
        FormFieldDefVO nameField = new FormFieldDefVO(
                1L, 100L, "name", "姓名", "text", true, null, 0,
                null, Map.of("required", true, "minLength", 2, "maxLength", 50), null, false, null, null);

        List<FieldError> errors = engine.validateField(nameField, "张三");

        assertThat(errors).isEmpty();
    }

    @Test
    void catchesMinLengthViolation() {
        FormFieldDefVO nameField = new FormFieldDefVO(
                1L, 100L, "name", "姓名", "text", false, null, 0,
                null, Map.of("minLength", 5), null, false, null, null);

        List<FieldError> errors = engine.validateField(nameField, "abc");

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).code()).isEqualTo("minLength");
    }

    @Test
    void validatesWholeForm() {
        FormFieldDefVO nameField = new FormFieldDefVO(
                1L, 100L, "name", "姓名", "text", true, null, 0,
                null, Map.of("required", true), null, false, null, null);

        FormSubmitRequest req = new FormSubmitRequest(100L, Map.of("name", ""), null);
        FormValidationResult result = engine.validateForm(req, List.of(nameField), Map.of());

        assertThat(result.isOk()).isFalse();
        assertThat(result.fieldErrors()).hasSize(1);
    }
}
```

- [ ] **Step 5: Run tests**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am test -Dtest='RequiredRuleTest,PatternRuleTest,ValidationRuleRegistryTest,ValidationEngineTest'
```

Expected: 12+ tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend
git add safe-validator-form/src/test
git commit -m "test(form): add tests for validation rules and engine"
```

**Phase 4 complete.** Proceed to [Part 5: Schema Entities, Mappers, Services](2026-06-26-form-schema-backend-part5-schema-services.md).
