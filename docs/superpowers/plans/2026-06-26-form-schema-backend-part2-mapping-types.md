# Part 2: Mapping — Registries + 10 Field Types

**Phase:** 2 of 7
**Tasks:** 2.1 – 2.5
**End state:** `FieldTypeRegistry` populated with 10 FieldType beans. Tests pass.

**No Lombok** — explicit getters/setters throughout.

---

## Task 2.1: FieldType interface + ConfigSchema

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/FieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/ConfigSchema.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/FieldTypeRegistry.java`

- [ ] **Step 1: Create ConfigSchema (describes type-specific config fields for designer UI)**

```java
package com.safevalidator.form.mapping.type;

import java.util.List;

public record ConfigSchema(List<ConfigField> fields) {
    public static ConfigSchema empty() {
        return new ConfigSchema(List.of());
    }

    public record ConfigField(
            String name,
            String label,
            String type,        // "string" | "number" | "boolean" | "select" | "select-multi"
            boolean required,
            Object defaultValue,
            List<Option> options        // for select type
    ) {}

    public record Option(String label, Object value) {}
}
```

- [ ] **Step 2: Create FieldType interface**

```java
package com.safevalidator.form.mapping.type;

import java.util.Set;

public interface FieldType {

    /** Unique identifier — stored in form_field_def.type column */
    String name();

    /** Display label for the designer */
    String label();

    default String description() {
        return "";
    }

    /** Configuration schema (drives the designer's field-edit form) */
    default ConfigSchema configSchema() {
        return ConfigSchema.empty();
    }

    /** Parse raw user input into the canonical form for this type.
     *  Throws IllegalArgumentException on invalid input. */
    Object parseValue(Object rawValue);

    /** Convert display value to storage value (e.g. number → string for VARCHAR column).
     *  Default: passthrough. */
    default Object toStorageValue(Object displayValue, FieldTypeRegistry registry) {
        return displayValue;
    }

    /** Convert storage value back to display value.
     *  Default: passthrough. */
    default Object fromStorageValue(Object storageValue, FieldTypeRegistry registry) {
        return storageValue;
    }

    /** Validation rule names that apply to this type. */
    Set<String> applicableRules();
}
```

- [ ] **Step 3: Create FieldTypeRegistry**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class FieldTypeRegistry {

    private final Map<String, FieldType> types = new LinkedHashMap<>();

    public FieldTypeRegistry(List<FieldType> fieldTypes) {
        for (FieldType t : fieldTypes) {
            types.put(t.name(), t);
        }
    }

    public FieldType get(String name) {
        FieldType t = types.get(name);
        if (t == null) {
            throw new IllegalArgumentException("Unknown field type: " + name);
        }
        return t;
    }

    public Optional<FieldType> find(String name) {
        return Optional.ofNullable(types.get(name));
    }

    public List<FieldType> listAll() {
        return List.copyOf(types.values());
    }

    public Collection<String> names() {
        return Collections.unmodifiableSet(types.keySet());
    }
}
```

- [ ] **Step 4: Verify compile**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
```

- [ ] **Step 5: Commit**

```bash
cd backend
git add safe-validator-form
git commit -m "feat(form): add FieldType interface, ConfigSchema, and FieldTypeRegistry"
```

---

## Task 2.2: First batch of field types (text, longtext, number, boolean)

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/TextFieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/LongtextFieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/NumberFieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/BooleanFieldType.java`

- [ ] **Step 1: TextFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class TextFieldType implements FieldType {

    @Override public String name() { return "text"; }
    @Override public String label() { return "文本"; }
    @Override public String description() { return "短文本，单行输入"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("maxLength", "最大长度", "number", false, 255, List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        return rawValue.toString();
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minLength", "maxLength", "pattern");
    }
}
```

- [ ] **Step 2: LongtextFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class LongtextFieldType implements FieldType {

    @Override public String name() { return "longtext"; }
    @Override public String label() { return "长文本"; }
    @Override public String description() { return "多行文本"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("rows", "行数", "number", false, 4, List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        return rawValue.toString();
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minLength", "maxLength");
    }
}
```

- [ ] **Step 3: NumberFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Component
public class NumberFieldType implements FieldType {

    @Override public String name() { return "number"; }
    @Override public String label() { return "数字"; }
    @Override public String description() { return "整数或小数"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("precision", "总位数", "number", false, 18, List.of()),
                new ConfigSchema.ConfigField("scale", "小数位", "number", false, 2, List.of()),
                new ConfigSchema.ConfigField("integer", "仅整数", "boolean", false, false, List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Number n) return n;
        if (rawValue instanceof String s) {
            if (s.isBlank()) return null;
            try {
                return new BigDecimal(s.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid number: " + s);
            }
        }
        throw new IllegalArgumentException("Cannot parse number from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "min", "max", "integer");
    }
}
```

- [ ] **Step 4: BooleanFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class BooleanFieldType implements FieldType {

    @Override public String name() { return "boolean"; }
    @Override public String label() { return "布尔"; }
    @Override public String description() { return "是/否开关"; }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Boolean b) return b;
        if (rawValue instanceof String s) {
            return switch (s.toLowerCase()) {
                case "true", "1", "yes", "on" -> true;
                case "false", "0", "no", "off" -> false;
                default -> throw new IllegalArgumentException("Invalid boolean: " + s);
            };
        }
        if (rawValue instanceof Number n) return n.intValue() != 0;
        throw new IllegalArgumentException("Cannot parse boolean from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required");
    }
}
```

- [ ] **Step 5: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add text/longtext/number/boolean field types"
```

---

## Task 2.3: Date/DateTime/Select/Multiselect field types

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/DateFieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/DateTimeFieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/SelectFieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/MultiselectFieldType.java`

- [ ] **Step 1: DateFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;

@Component
public class DateFieldType implements FieldType {

    @Override public String name() { return "date"; }
    @Override public String label() { return "日期"; }
    @Override public String description() { return "年-月-日"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("format", "格式", "string", false, "yyyy-MM-dd", List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof LocalDate d) return d;
        if (rawValue instanceof String s) {
            try {
                return LocalDate.parse(s.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid date: " + s + " (expected yyyy-MM-dd)");
            }
        }
        throw new IllegalArgumentException("Cannot parse date from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minDate", "maxDate");
    }
}
```

- [ ] **Step 2: DateTimeFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;

@Component
public class DateTimeFieldType implements FieldType {

    @Override public String name() { return "datetime"; }
    @Override public String label() { return "日期时间"; }
    @Override public String description() { return "年-月-日 时:分:秒"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("format", "格式", "string", false, "yyyy-MM-dd HH:mm:ss", List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof LocalDateTime dt) return dt;
        if (rawValue instanceof String s) {
            try {
                // try ISO_LOCAL_DATE_TIME first
                return LocalDateTime.parse(s.trim(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (DateTimeParseException e1) {
                try {
                    // fall back to "yyyy-MM-dd HH:mm:ss"
                    return LocalDateTime.parse(s.trim(),
                            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                } catch (DateTimeParseException e2) {
                    throw new IllegalArgumentException("Invalid datetime: " + s);
                }
            }
        }
        throw new IllegalArgumentException("Cannot parse datetime from: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minDate", "maxDate");
    }
}
```

- [ ] **Step 3: SelectFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class SelectFieldType implements FieldType {

    @Override public String name() { return "select"; }
    @Override public String label() { return "单选"; }
    @Override public String description() { return "从预设选项中选择一个"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("options", "选项", "select-multi", true, List.of(), List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        return rawValue.toString();
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "inOptions");
    }
}
```

- [ ] **Step 4: MultiselectFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

@Component
public class MultiselectFieldType implements FieldType {

    @Override public String name() { return "multiselect"; }
    @Override public String label() { return "多选"; }
    @Override public String description() { return "从预设选项中选择多个"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("options", "选项", "select-multi", true, List.of(), List.of())
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Collection<?> c) {
            List<String> result = new ArrayList<>();
            for (Object o : c) {
                if (o == null) continue;
                result.add(o.toString());
            }
            return result;
        }
        throw new IllegalArgumentException("Expected list for multiselect, got: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "minItems", "maxItems");
    }
}
```

- [ ] **Step 5: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add date/datetime/select/multiselect field types"
```

---

## Task 2.4: File + Reference field types

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/FileFieldType.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/type/ReferenceFieldType.java`

- [ ] **Step 1: FileFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class FileFieldType implements FieldType {

    @Override public String name() { return "file"; }
    @Override public String label() { return "文件"; }
    @Override public String description() { return "上传文件，存为 {url, name, size}"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("maxSize", "最大字节数", "number", false, 10_485_760, List.of()),
                new ConfigSchema.ConfigField("allowedTypes", "允许的 MIME 类型", "string", false, "", List.of()),
                new ConfigSchema.ConfigField("storage", "存储位置", "select", false, "local",
                        List.of(new ConfigSchema.Option("本地", "local"), new ConfigSchema.Option("对象存储", "oss")))
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        // Expect: { url, name, size } (Map or already a structured object)
        return rawValue;
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "maxSize", "allowedTypes");
    }
}
```

- [ ] **Step 2: ReferenceFieldType**

```java
package com.safevalidator.form.mapping.type;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class ReferenceFieldType implements FieldType {

    @Override public String name() { return "reference"; }
    @Override public String label() { return "引用"; }
    @Override public String description() { return "引用其他表单的某条记录"; }

    @Override
    public ConfigSchema configSchema() {
        return new ConfigSchema(List.of(
                new ConfigSchema.ConfigField("referenceFormId", "目标表单 ID", "number", true, null, List.of()),
                new ConfigSchema.ConfigField("referenceDisplayField", "显示字段 code", "string", true, null, List.of()),
                new ConfigSchema.ConfigField("referenceStorageAs", "存储类型", "select", false, "bigint",
                        List.of(
                                new ConfigSchema.Option("BIGINT", "bigint"),
                                new ConfigSchema.Option("VARCHAR", "varchar")
                        ))
        ));
    }

    @Override
    public Object parseValue(Object rawValue) {
        if (rawValue == null) return null;
        if (rawValue instanceof Number n) return n.longValue();
        if (rawValue instanceof String s) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid reference id: " + s);
            }
        }
        throw new IllegalArgumentException("Reference must be a number/string id, got: " + rawValue);
    }

    @Override
    public Set<String> applicableRules() {
        return Set.of("required", "referenceExists");
    }
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add file/reference field types"
```

---

## Task 2.5: Test FieldTypeRegistry and 10 field types

**Files:**
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/type/FieldTypeRegistryTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/type/TextFieldTypeTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/type/NumberFieldTypeTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/type/ReferenceFieldTypeTest.java`

- [ ] **Step 1: Create FieldTypeRegistryTest**

```java
package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class FieldTypeRegistryTest {

    @Test
    void registryLoadsAllBuiltinTypes() {
        FieldTypeRegistry registry = new FieldTypeRegistry(List.of(
                new TextFieldType(),
                new NumberFieldType(),
                new ReferenceFieldType()
        ));

        assertThat(registry.listAll()).hasSize(3);
        assertThat(registry.get("text").name()).isEqualTo("text");
        assertThat(registry.get("number").name()).isEqualTo("number");
        assertThat(registry.get("reference").name()).isEqualTo("reference");
    }

    @Test
    void getUnknownTypeThrows() {
        FieldTypeRegistry registry = new FieldTypeRegistry(List.of(new TextFieldType()));
        assertThatThrownBy(() -> registry.get("nonexistent"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown field type");
    }

    @Test
    void findReturnsOptional() {
        FieldTypeRegistry registry = new FieldTypeRegistry(List.of(new TextFieldType()));
        assertThat(registry.find("text")).isPresent();
        assertThat(registry.find("missing")).isEmpty();
    }
}
```

- [ ] **Step 2: Create TextFieldTypeTest**

```java
package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class TextFieldTypeTest {

    private final TextFieldType type = new TextFieldType();

    @Test
    void parsesStringValue() {
        assertThat(type.parseValue("hello")).isEqualTo("hello");
    }

    @Test
    void handlesNull() {
        assertThat(type.parseValue(null)).isNull();
    }

    @Test
    void toStringCoercesNonString() {
        assertThat(type.parseValue(123)).isEqualTo("123");
    }

    @Test
    void applicableRulesIncludesRequiredAndLength() {
        assertThat(type.applicableRules())
                .contains("required", "minLength", "maxLength", "pattern");
    }
}
```

- [ ] **Step 3: Create NumberFieldTypeTest**

```java
package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

class NumberFieldTypeTest {

    private final NumberFieldType type = new NumberFieldType();

    @Test
    void parsesInteger() {
        assertThat(type.parseValue(42)).isEqualTo(42);
    }

    @Test
    void parsesDecimalString() {
        Object result = type.parseValue("3.14");
        assertThat(result).isInstanceOf(BigDecimal.class);
        assertThat(((BigDecimal) result).doubleValue()).isEqualTo(3.14);
    }

    @Test
    void invalidStringThrows() {
        assertThatThrownBy(() -> type.parseValue("not a number"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid number");
    }

    @Test
    void blankStringReturnsNull() {
        assertThat(type.parseValue("   ")).isNull();
    }
}
```

- [ ] **Step 4: Create ReferenceFieldTypeTest**

```java
package com.safevalidator.form.mapping.type;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class ReferenceFieldTypeTest {

    private final ReferenceFieldType type = new ReferenceFieldType();

    @Test
    void parsesLongId() {
        assertThat(type.parseValue(42L)).isEqualTo(42L);
    }

    @Test
    void parsesIntegerId() {
        assertThat(type.parseValue(100)).isEqualTo(100L);
    }

    @Test
    void parsesStringId() {
        assertThat(type.parseValue("123")).isEqualTo(123L);
    }

    @Test
    void invalidStringThrows() {
        assertThatThrownBy(() -> type.parseValue("not-a-number"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid reference id");
    }

    @Test
    void nullReturnsNull() {
        assertThat(type.parseValue(null)).isNull();
    }
}
```

- [ ] **Step 5: Run tests**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am test -Dtest='FieldTypeRegistryTest,TextFieldTypeTest,NumberFieldTypeTest,ReferenceFieldTypeTest'
```

Expected: 14 tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend
git add safe-validator-form/src/test
git commit -m "test(form): add tests for FieldTypeRegistry and 4 field types"
```

**Phase 2 complete.** Proceed to [Part 3: Mapping — 9 Converters + Introspector](2026-06-26-form-schema-backend-part3-mapping-converters.md).
