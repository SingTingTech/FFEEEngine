# Part 4: Form Placeholder & Start Module

**Phase:** 4 of 7
**Tasks:** 4.1 – 4.5
**End state:** Backend boots cleanly, SpringDoc OpenAPI live, Flyway migrations run, all admin APIs respond.

**Pre-requisite:** Phase 3 complete.

---

## Task 4.1: SafeValidatorApplication main class

**Files:**
- Create: `backend/safe-validator-start/src/main/java/com/safevalidator/start/SafeValidatorApplication.java`
- Delete: `backend/safe-validator-start/src/main/java/com/safevalidator/start/StartMarker.java`

- [ ] **Step 1: Create main class**

```java
package com.safevalidator.start;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = "com.safevalidator")
@EnableAsync
@MapperScan(basePackages = "com.safevalidator.**.mapper")
public class SafeValidatorApplication {

    public static void main(String[] args) {
        SpringApplication.run(SafeValidatorApplication.class, args);
    }
}
```

- [ ] **Step 2: Delete marker**

```bash
rm /home/cris/dev/safeValidator/backend/safe-validator-start/src/main/java/com/safevalidator/start/StartMarker.java
```

- [ ] **Step 3: Verify compile**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-start compile
```

- [ ] **Step 4: Commit**

```bash
cd backend
git add safe-validator-start
git commit -m "feat(start): add SafeValidatorApplication main class"
```

---

## Task 4.2: Form module package structure

**Files:**
- Create: `backend/safe-validator-form/src/main/java/com/safevalidator/form/schema/package-info.java`
- Create: `backend/safe-validator-form/src/main/java/com/safevalidator/form/runtime/package-info.java`
- Create: `backend/safe-validator-form/src/main/java/com/safevalidator/form/mapping/package-info.java`
- Create: `backend/safe-validator-form/src/main/java/com/safevalidator/form/validation/package-info.java`
- Delete: `backend/safe-validator-form/src/main/java/com/safevalidator/form/FormMarker.java`

- [ ] **Step 1: Create package directories**

```bash
cd /home/cris/dev/safeValidator/backend/safe-validator-form/src/main/java/com/safevalidator/form
mkdir -p schema runtime mapping validation
```

- [ ] **Step 2: Create package-info.java for each**

```java
// schema/package-info.java
/**
 * Form schema definitions: FormSchema, FormVersion, FormFieldDef.
 * Sub-project 2 will add the actual classes.
 */
package com.safevalidator.form.schema;
```

```java
// runtime/package-info.java
/**
 * Form runtime: dynamic SQL builders, JSONB serialization, data access.
 * Sub-project 2 will add the actual classes.
 */
package com.safevalidator.form.runtime;
```

```java
// mapping/package-info.java
/**
 * Field mapping engine: maps form fields to relational columns or JSONB.
 * Sub-project 2 will add the actual classes.
 */
package com.safevalidator.form.mapping;
```

```java
// validation/package-info.java
/**
 * Validation engine: rule definitions, chain validation, cross-field checks.
 * Sub-project 2 will add the actual classes.
 */
package com.safevalidator.form.validation;
```

- [ ] **Step 3: Delete marker**

```bash
rm /home/cris/dev/safeValidator/backend/safe-validator-form/src/main/java/com/safevalidator/form/FormMarker.java
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form compile
cd backend
git add safe-validator-form
git commit -m "feat(form): scaffold package structure for sub-project 2"
```

---

## Task 4.3: OpenAPI configuration

**Files:**
- Create: `backend/safe-validator-start/src/main/java/com/safevalidator/start/config/OpenApiConfig.java`

- [ ] **Step 1: Create config package**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-start/src/main/java/com/safevalidator/start/config
```

- [ ] **Step 2: Create OpenApiConfig**

```java
package com.safevalidator.start.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("safeValidator API")
                        .version("1.0.0")
                        .description("Form engine platform — admin and form runtime APIs"))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-start compile
cd backend
git add safe-validator-start
git commit -m "feat(start): add OpenAPI configuration with bearer auth scheme"
```

---

## Task 4.4: logback-spring.xml

**Files:**
- Create: `backend/safe-validator-start/src/main/resources/logback-spring.xml`

- [ ] **Step 1: Create logback config**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>

    <property name="LOG_DIR" value="${LOG_DIR:-logs}"/>

    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_DIR}/safe-validator.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_DIR}/safe-validator.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>100MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>5GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <springProfile name="dev">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="FILE"/>
        </root>
        <logger name="com.safevalidator" level="DEBUG"/>
        <logger name="org.springframework.security" level="INFO"/>
    </springProfile>

    <springProfile name="prod">
        <root level="WARN">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="FILE"/>
        </root>
        <logger name="com.safevalidator" level="INFO"/>
    </springProfile>

    <springProfile name="!dev &amp; !prod">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>

</configuration>
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add safe-validator-start/src/main/resources/logback-spring.xml
git commit -m "feat(start): add logback configuration with profile-based levels"
```

---

## Task 4.5: Full backend boot verification

- [ ] **Step 1: Start postgres + redis containers**

```bash
docker run -d --name sv-postgres -e POSTGRES_DB=safe_validator -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
docker run -d --name sv-redis -p 6379:6379 redis:7-alpine
```

- [ ] **Step 2: Run backend**

```bash
cd /home/cris/dev/safeValidator/backend
DB_PASSWORD=postgres \
JWT_SECRET=this-is-a-test-secret-for-development-only-32bytes \
mvn -pl safe-validator-start spring-boot:run
```

- [ ] **Step 3: Confirm boot success in logs**

Look for: `Started SafeValidatorApplication in X.XXX seconds`

- [ ] **Step 4: Test Swagger UI**

Open `http://localhost:8080/swagger-ui.html` in browser.

Expected: API docs page with `auth`, `admin/users`, `admin/roles`, `admin/permissions` tags.

- [ ] **Step 5: Test full auth flow**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.accessToken')

echo "Token: $TOKEN"
echo "---"
echo "User list:"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/users | jq .
echo "---"
echo "Role list:"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/roles | jq .
echo "---"
echo "Permission tree:"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/permissions/tree | jq .
```

All calls should return `code: 0` with proper data.

- [ ] **Step 6: Test user CRUD**

```bash
# Create user
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    http://localhost:8080/admin/users \
    -d '{"username":"testuser","password":"test1234","realName":"Test","email":"test@example.com","status":1,"roleIds":[2]}'
echo "---"

# List users (should now have 2)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/admin/users | jq .data.total
```

Expected: `2`

- [ ] **Step 7: Stop backend + containers**

```bash
# Ctrl-C the backend (or kill the spring-boot:run process)
docker stop sv-postgres sv-redis && docker rm sv-postgres sv-redis
```

- [ ] **Step 8: Commit any final fixes**

```bash
cd backend
git status
# Fix anything outstanding, then:
git add -A
git commit -m "chore: phase 4 verified" --allow-empty
```

**Phase 4 complete.** Proceed to [Part 5: Frontend Monorepo](./2026-06-25-infrastructure-layer-part5-frontend-monorepo.md).
