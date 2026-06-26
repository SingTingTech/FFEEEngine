# Part 3: Mapping — 9 Type Converters + Column Introspector

**Phase:** 3 of 7
**Tasks:** 3.1 – 3.5
**End state:** TypeConverterRegistry with 9 converters + ColumnIntrospector that lists PG tables/columns.

---

## Task 3.1: TypeConverter interface + TypeConverterRegistry

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/TypeConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/TypeConverterRegistry.java`

- [ ] **Step 1: Create TypeConverter interface**

```java
package com.safevalidator.form.mapping.converter;

import java.util.Set;

public interface TypeConverter {

    /** Source display types this converter handles */
    Set<String> sourceTypes();

    /** Target storage type names (e.g. "varchar", "int4", "jsonb") this converter produces */
    Set<String> targetTypes();

    /** Convert the value. Throws IllegalArgumentException on failure. */
    Object convert(Object value);
}
```

- [ ] **Step 2: Create TypeConverterRegistry**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class TypeConverterRegistry {

    private final List<TypeConverter> converters;

    public TypeConverterRegistry(List<TypeConverter> converters) {
        this.converters = List.copyOf(converters);
    }

    /**
     * Find a converter that handles the given source→target pair.
     * Special rule: if source and target types match, returns the first matching converter
     * (typically PassthroughConverter).
     */
    public Optional<TypeConverter> find(String sourceType, String targetType) {
        for (TypeConverter c : converters) {
            if (c.sourceTypes().contains(sourceType) && c.targetTypes().contains(targetType)) {
                return Optional.of(c);
            }
        }
        return Optional.empty();
    }

    public Object convert(String sourceType, String targetType, Object value) {
        if (value == null) return null;
        return find(sourceType, targetType)
                .orElseThrow(() -> new IllegalStateException(
                        "No converter found: " + sourceType + " -> " + targetType))
                .convert(value);
    }
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add TypeConverter interface and registry"
```

---

## Task 3.2: Passthrough + 3 string-to-X converters

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/PassthroughConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/StringToDateConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/StringToNumberConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/StringToBooleanConverter.java`

- [ ] **Step 1: PassthroughConverter**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

/** Default fallback when no conversion is needed. Handles any→any. */
@Component
public class PassthroughConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("*"); }
    @Override public Set<String> targetTypes() { return Set.of("*"); }
    @Override public Object convert(Object value) { return value; }
}
```

- [ ] **Step 2: StringToDateConverter**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Component
public class StringToDateConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("text", "date", "datetime"); }
    @Override public Set<String> targetTypes() { return Set.of("date", "timestamp"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate || value instanceof LocalDateTime) return value;
        String s = value.toString().trim();
        try {
            // If string is ISO date-time, truncate to date
            if (s.length() > 10 && s.charAt(10) == 'T' || s.length() > 10 && s.charAt(10) == ' ') {
                return LocalDateTime.parse(s.replace(' ', 'T'), DateTimeFormatter.ISO_LOCAL_DATE_TIME).toLocalDate();
            }
            return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot convert '" + s + "' to date", e);
        }
    }
}
```

- [ ] **Step 3: StringToNumberConverter**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

@Component
public class StringToNumberConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("text", "number"); }
    @Override public Set<String> targetTypes() { return Set.of("int2", "int4", "int8", "numeric", "float4", "float8"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n;
        String s = value.toString().trim();
        if (s.isEmpty()) return null;
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Cannot convert '" + s + "' to number", e);
        }
    }
}
```

- [ ] **Step 4: StringToBooleanConverter**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class StringToBooleanConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("text", "boolean"); }
    @Override public Set<String> targetTypes() { return Set.of("bool", "varchar"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b;
        String s = value.toString().trim().toLowerCase();
        return switch (s) {
            case "true", "1", "yes", "on" -> true;
            case "false", "0", "no", "off" -> false;
            default -> throw new IllegalArgumentException("Cannot convert '" + s + "' to boolean");
        };
    }
}
```

- [ ] **Step 5: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add Passthrough + 3 string-to-X converters"
```

---

## Task 3.3: X-to-String + JSONB converters

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/NumberToStringConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/DateToStringConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/BooleanToNumberConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/JsonNodeConverter.java`
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/converter/MultiselectToJsonbConverter.java`

- [ ] **Step 1: NumberToStringConverter**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class NumberToStringConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("number", "text"); }
    @Override public Set<String> targetTypes() { return Set.of("varchar", "text"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        return value.toString();
    }
}
```

- [ ] **Step 2: DateToStringConverter**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Component
public class DateToStringConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("date", "datetime", "text"); }
    @Override public Set<String> targetTypes() { return Set.of("varchar", "text"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        if (value instanceof LocalDate d) return d.format(DateTimeFormatter.ISO_LOCAL_DATE);
        if (value instanceof LocalDateTime dt) return dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        return value.toString();
    }
}
```

- [ ] **Step 3: BooleanToNumberConverter**

```java
package com.safevalidator.form.mapping.converter;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class BooleanToNumberConverter implements TypeConverter {

    @Override public Set<String> sourceTypes() { return Set.of("boolean"); }
    @Override public Set<String> targetTypes() { return Set.of("int2", "int4", "varchar"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b ? 1 : 0;
        if (value instanceof Number n) return n;
        return value;
    }
}
```

- [ ] **Step 4: JsonNodeConverter**

```java
package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Set;

/** Converts any value to JSONB by serializing to JSON. */
@Component
public class JsonNodeConverter implements TypeConverter {

    private final ObjectMapper objectMapper;

    public JsonNodeConverter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override public Set<String> sourceTypes() { return Set.of("*"); }
    @Override public Set<String> targetTypes() { return Set.of("jsonb"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.valueToTree(value);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot convert to JSON: " + value, e);
        }
    }
}
```

- [ ] **Step 5: MultiselectToJsonbConverter**

```java
package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class MultiselectToJsonbConverter implements TypeConverter {

    private final ObjectMapper objectMapper;

    public MultiselectToJsonbConverter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override public Set<String> sourceTypes() { return Set.of("multiselect", "text"); }
    @Override public Set<String> targetTypes() { return Set.of("jsonb", "varchar", "text"); }

    @Override
    public Object convert(Object value) {
        if (value == null) return null;
        if (value instanceof List<?> list) {
            try {
                return objectMapper.valueToTree(list);
            } catch (Exception e) {
                throw new IllegalArgumentException("Cannot convert list to JSONB", e);
            }
        }
        // wrap single value in list
        try {
            return objectMapper.valueToTree(List.of(value));
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot convert to JSONB list", e);
        }
    }
}
```

- [ ] **Step 6: Commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add 5 more type converters (number/date/boolean to string, JSONB, multiselect)"
```

---

## Task 3.4: ColumnIntrospector

**Files:**
- Create: `safe-validator-form/src/main/java/com/safevalidator/form/mapping/registry/ColumnIntrospector.java`

- [ ] **Step 1: Create ColumnIntrospector**

```java
package com.safevalidator.form.mapping.registry;

import com.safevalidator.form.mapping.dto.ColumnInfo;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

/**
 * Introspects PostgreSQL user tables and columns.
 * Excludes system schemas (pg_catalog, information_schema).
 */
@Component
public class ColumnIntrospector {

    private final DataSource dataSource;

    public ColumnIntrospector(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public List<String> listUserTables() {
        List<String> tables = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData md = conn.getMetaData();
            try (ResultSet rs = md.getTables(null, "public", null, new String[]{"TABLE"})) {
                while (rs.next()) {
                    String name = rs.getString("TABLE_NAME");
                    if (name != null && !name.startsWith("_")) {
                        tables.add(name);
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to list user tables", e);
        }
        return tables;
    }

    public List<ColumnInfo> listColumns(String tableName) {
        List<ColumnInfo> columns = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData md = conn.getMetaData();
            try (ResultSet rs = md.getColumns(null, "public", tableName, null)) {
                while (rs.next()) {
                    String name = rs.getString("COLUMN_NAME");
                    int jdbcType = rs.getInt("DATA_TYPE");
                    String typeName = rs.getString("TYPE_NAME");
                    boolean nullable = "YES".equals(rs.getString("IS_NULLABLE"));
                    int size = rs.getInt("COLUMN_SIZE");
                    Integer sizeOrNull = rs.wasNull() ? null : size;
                    columns.add(new ColumnInfo(name, jdbcType, typeName.toLowerCase(), nullable, sizeOrNull));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to list columns for " + tableName, e);
        }
        return columns;
    }
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am compile -q
cd backend
git add safe-validator-form
git commit -m "feat(form): add ColumnIntrospector for listing user tables/columns"
```

---

## Task 3.5: Tests for converters + introspector

**Files:**
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/converter/TypeConverterRegistryTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/converter/StringToDateConverterTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/converter/JsonNodeConverterTest.java`
- Create: `safe-validator-form/src/test/java/com/safevalidator/form/mapping/converter/DateToStringConverterTest.java`

- [ ] **Step 1: TypeConverterRegistryTest**

```java
package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class TypeConverterRegistryTest {

    @Test
    void findsStringToDateConverter() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(
                new PassthroughConverter(),
                new StringToDateConverter()
        ));
        assertThat(registry.find("text", "date")).isPresent();
    }

    @Test
    void findsPassthroughForMatchingTypes() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(new PassthroughConverter()));
        assertThat(registry.find("text", "varchar")).isPresent();
    }

    @Test
    void convertNullReturnsNull() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(new PassthroughConverter()));
        assertThat(registry.convert("text", "varchar", null)).isNull();
    }

    @Test
    void convertThrowsWhenNoConverterFound() {
        TypeConverterRegistry registry = new TypeConverterRegistry(List.of(new PassthroughConverter() {
            @Override public java.util.Set<String> targetTypes() { return java.util.Set.of("varchar"); }
        }));
        assertThatThrownBy(() -> registry.convert("text", "jsonb", "x"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No converter found");
    }
}
```

- [ ] **Step 2: StringToDateConverterTest**

```java
package com.safevalidator.form.mapping.converter;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

class StringToDateConverterTest {

    private final StringToDateConverter c = new StringToDateConverter();

    @Test
    void parsesIsoDate() {
        assertThat(c.convert("2026-06-26")).isInstanceOf(LocalDate.class);
    }

    @Test
    void parsesIsoDateTime() {
        assertThat(c.convert("2026-06-26T10:30:00")).isInstanceOf(LocalDate.class);
    }

    @Test
    void parsesDateTimeWithSpace() {
        assertThat(c.convert("2026-06-26 10:30:00")).isInstanceOf(LocalDate.class);
    }

    @Test
    void invalidStringThrows() {
        assertThatThrownBy(() -> c.convert("not-a-date"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void nullReturnsNull() {
        assertThat(c.convert(null)).isNull();
    }

    @Test
    void localDatePassThrough() {
        LocalDate d = LocalDate.of(2026, 1, 1);
        assertThat(c.convert(d)).isEqualTo(d);
    }
}
```

- [ ] **Step 3: JsonNodeConverterTest**

```java
package com.safevalidator.form.mapping.converter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class JsonNodeConverterTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final JsonNodeConverter c = new JsonNodeConverter(mapper);

    @Test
    void convertsMap() {
        JsonNode result = (JsonNode) c.convert(Map.of("a", 1, "b", "x"));
        assertThat(result.get("a").asInt()).isEqualTo(1);
        assertThat(result.get("b").asText()).isEqualTo("x");
    }

    @Test
    void convertsList() {
        JsonNode result = (JsonNode) c.convert(List.of(1, 2, 3));
        assertThat(result.isArray()).isTrue();
        assertThat(result.size()).isEqualTo(3);
    }
}
```

- [ ] **Step 4: DateToStringConverterTest**

```java
package com.safevalidator.form.mapping.converter;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

class DateToStringConverterTest {

    private final DateToStringConverter c = new DateToStringConverter();

    @Test
    void formatsLocalDate() {
        assertThat(c.convert(LocalDate.of(2026, 6, 26))).isEqualTo("2026-06-26");
    }

    @Test
    void formatsLocalDateTime() {
        LocalDateTime dt = LocalDateTime.of(2026, 6, 26, 10, 30, 0);
        assertThat(c.convert(dt)).isEqualTo("2026-06-26 10:30:00");
    }

    @Test
    void stringPassThrough() {
        assertThat(c.convert("2026-06-26")).isEqualTo("2026-06-26");
    }

    @Test
    void nullReturnsNull() {
        assertThat(c.convert(null)).isNull();
    }
}
```

- [ ] **Step 5: Run tests**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form -am test -Dtest='TypeConverterRegistryTest,StringToDateConverterTest,JsonNodeConverterTest,DateToStringConverterTest'
```

Expected: 14 tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend
git add safe-validator-form/src/test
git commit -m "test(form): add tests for TypeConverterRegistry and 3 converters"
```

**Phase 3 complete.** Proceed to [Part 4: Validation — Engine + 9 Rules](2026-06-26-form-schema-backend-part4-validation.md).
