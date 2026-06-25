# Part 2: Common Module & Database

**Phase:** 2 of 7
**Tasks:** 2.1 – 2.12
**End state:** Common module ships all shared types; Flyway migrations create metadata tables; admin seed data inserted; `mvn compile` succeeds.

**Pre-requisite:** Phase 1 complete.

---

## Task 2.1: Result<T> response wrapper

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/api/Result.java`
- Delete: `backend/safe-validator-common/src/main/java/com/safevalidator/common/CommonMarker.java`

- [ ] **Step 1: Create `api` package and `Result.java`**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common/api
```

Create `Result.java`:

```java
package com.safevalidator.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Unified API response")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Result<T>(int code, String message, T data) {

    public static final int SUCCESS_CODE = 0;

    public static <T> Result<T> ok() {
        return new Result<>(SUCCESS_CODE, "ok", null);
    }

    public static <T> Result<T> ok(T data) {
        return new Result<>(SUCCESS_CODE, "ok", data);
    }

    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }

    public boolean isSuccess() {
        return code == SUCCESS_CODE;
    }
}
```

- [ ] **Step 2: Delete the temporary marker**

```bash
rm /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common/CommonMarker.java
```

- [ ] **Step 3: Verify compile**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
cd backend
git add safe-validator-common
git commit -m "feat(common): add Result<T> unified response wrapper"
```

---

## Task 2.2: ErrorCode enum

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/api/ErrorCode.java`

- [ ] **Step 1: Create ErrorCode**

```java
package com.safevalidator.common.api;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Standard error codes")
public enum ErrorCode {

    SUCCESS(0, "ok"),
    BAD_REQUEST(40000, "请求参数错误"),
    UNAUTHORIZED(40100, "未登录或登录已过期"),
    FORBIDDEN(40300, "权限不足"),
    NOT_FOUND(40400, "资源不存在"),
    CONFLICT(40900, "资源冲突"),

    USER_NOT_FOUND(50001, "用户不存在"),
    USER_PASSWORD_INVALID(50002, "用户名或密码错误"),
    USER_DISABLED(50003, "用户已禁用"),
    USERNAME_DUPLICATE(50004, "用户名已存在"),

    ROLE_NOT_FOUND(51001, "角色不存在"),
    ROLE_NAME_DUPLICATE(51002, "角色名称已存在"),
    ROLE_IN_USE(51003, "角色正在使用中，无法删除"),

    TOKEN_INVALID(52001, "令牌无效"),
    TOKEN_EXPIRED(52002, "令牌已过期"),
    TOKEN_BLACKLISTED(52003, "令牌已撤销"),

    SYSTEM_ERROR(99999, "系统异常");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int code() { return code; }
    public String message() { return message; }
}
```

- [ ] **Step 2: Verify compile**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add safe-validator-common
git commit -m "feat(common): add ErrorCode enum with standard error codes"
```

---

## Task 2.3: BizException

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/exception/BizException.java`

- [ ] **Step 1: Create BizException**

```java
package com.safevalidator.common.exception;

import com.safevalidator.common.api.ErrorCode;

public class BizException extends RuntimeException {

    private final ErrorCode errorCode;

    public BizException(ErrorCode errorCode) {
        super(errorCode.message());
        this.errorCode = errorCode;
    }

    public BizException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
    }

    public BizException(ErrorCode errorCode, Throwable cause) {
        super(errorCode.message(), cause);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add BizException"
```

---

## Task 2.4: GlobalExceptionHandler

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Create GlobalExceptionHandler**

```java
package com.safevalidator.common.exception;

import com.safevalidator.common.api.ErrorCode;
import com.safevalidator.common.api.Result;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public ResponseEntity<Result<Void>> handleBiz(BizException ex) {
        log.warn("Business exception: code={} message={}", ex.getErrorCode().code(), ex.getMessage());
        return ResponseEntity.ok(Result.error(ex.getErrorCode().code(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining("; "));
        log.warn("Validation failed: {}", message);
        return ResponseEntity.ok(Result.error(ErrorCode.BAD_REQUEST.code(), message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Result<Void>> handleConstraint(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(this::formatViolation)
                .collect(Collectors.joining("; "));
        log.warn("Constraint violation: {}", message);
        return ResponseEntity.ok(Result.error(ErrorCode.BAD_REQUEST.code(), message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleAny(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(ErrorCode.SYSTEM_ERROR.code(), ErrorCode.SYSTEM_ERROR.message()));
    }

    private String formatFieldError(FieldError err) {
        return err.getField() + ": " + err.getDefaultMessage();
    }

    private String formatViolation(ConstraintViolation<?> v) {
        return v.getPropertyPath() + ": " + v.getMessage();
    }
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add GlobalExceptionHandler for unified error responses"
```

---

## Task 2.5: BaseEntity

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/entity/BaseEntity.java`

- [ ] **Step 1: Create BaseEntity**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common/entity
```

```java
package com.safevalidator.common.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableLogic;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
public abstract class BaseEntity implements Serializable {

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableField(value = "create_by", fill = FieldFill.INSERT)
    private Long createBy;

    @TableField(value = "update_by", fill = FieldFill.INSERT_UPDATE)
    private Long updateBy;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add BaseEntity with audit fields and logical delete"
```

---

## Task 2.6: PageQuery + PageResult

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/api/PageQuery.java`
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/api/PageResult.java`

- [ ] **Step 1: Create PageQuery**

```java
package com.safevalidator.common.api;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Pagination query parameters")
public record PageQuery(
        @Schema(description = "Page number (1-based)", example = "1") Integer pageNum,
        @Schema(description = "Page size", example = "20") Integer pageSize,
        @Schema(description = "Sort field") String sortBy,
        @Schema(description = "Sort direction (asc/desc)") String sortDir,
        @Schema(description = "Keyword filter") String keyword
) {
    public PageQuery {
        if (pageNum == null || pageNum < 1) pageNum = 1;
        if (pageSize == null || pageSize < 1) pageSize = 20;
        if (pageSize > 200) pageSize = 200;
        if (sortDir == null) sortDir = "desc";
    }
}
```

- [ ] **Step 2: Create PageResult**

```java
package com.safevalidator.common.api;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Pagination result")
public record PageResult<T>(
        List<T> records,
        long total,
        int pageNum,
        int pageSize
) {
    public static <T> PageResult<T> of(List<T> records, long total, int pageNum, int pageSize) {
        return new PageResult<>(records, total, pageNum, pageSize);
    }

    public static <T> PageResult<T> empty(int pageNum, int pageSize) {
        return new PageResult<>(List.of(), 0L, pageNum, pageSize);
    }
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add PageQuery and PageResult pagination types"
```

---

## Task 2.7: JSONB TypeHandler

**Files:**
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/jackson/BaseJsonbTypeHandler.java`
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/jackson/JsonbNodeTypeHandler.java`

- [ ] **Step 1: Create jackson package**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common/jackson
```

- [ ] **Step 2: Create BaseJsonbTypeHandler abstract base**

```java
package com.safevalidator.common.jackson;

import com.baomidou.mybatisplus.extension.handlers.AbstractJsonTypeHandler;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.ibatis.type.JdbcType;
import org.postgresql.util.PGobject;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Base JSONB type handler. Subclasses provide the target Class; serialization
 * uses the shared Jackson ObjectMapper bean (auto-wired by MyBatis-Plus).
 */
public abstract class BaseJsonbTypeHandler<T> extends AbstractJsonTypeHandler<T> {

    private static final String JSONB_TYPE = "jsonb";

    protected final Class<T> type;
    protected ObjectMapper objectMapper;

    protected BaseJsonbTypeHandler(Class<T> type) {
        super(type);
        this.type = type;
    }

    public void setObjectMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, T parameter, JdbcType jdbcType) throws SQLException {
        try {
            if (objectMapper == null) {
                throw new IllegalStateException("ObjectMapper not injected. Did you register the handler bean?");
            }
            PGobject pg = new PGobject();
            pg.setType(JSONB_TYPE);
            pg.setValue(objectMapper.writeValueAsString(parameter));
            ps.setObject(i, pg);
        } catch (JsonProcessingException e) {
            throw new SQLException("Failed to serialize JSONB value", e);
        }
    }

    @Override
    public T getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return parse(rs.getString(columnName));
    }

    @Override
    public T getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return parse(rs.getString(columnIndex));
    }

    @Override
    public T getNullableResult(java.sql.CallableStatement cs, int columnIndex) throws SQLException {
        return parse(cs.getString(columnIndex));
    }

    private T parse(String json) throws SQLException {
        if (json == null) return null;
        try {
            if (objectMapper == null) {
                throw new IllegalStateException("ObjectMapper not injected.");
            }
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException e) {
            throw new SQLException("Failed to deserialize JSONB value", e);
        }
    }

    @Override
    protected String toJson(T obj) {
        try {
            if (objectMapper == null) {
                throw new IllegalStateException("ObjectMapper not injected.");
            }
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
```

- [ ] **Step 3: Create JsonbNodeTypeHandler for JsonNode**

```java
package com.safevalidator.common.jackson;

import com.fasterxml.jackson.databind.JsonNode;

public class JsonbNodeTypeHandler extends BaseJsonbTypeHandler<JsonNode> {
    public JsonbNodeTypeHandler() {
        super(JsonNode.class);
    }
}
```

- [ ] **Step 4: Verify compile + commit**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
cd backend
git add safe-validator-common
git commit -m "feat(common): add JSONB TypeHandler base and JsonNode variant"
```

---

## Task 2.8: Profile-specific configuration files

**Files:**
- Create: `backend/safe-validator-start/src/main/resources/application-dev.yml`
- Create: `backend/safe-validator-start/src/main/resources/application-prod.yml`
- Modify: `backend/safe-validator-start/src/main/resources/application.yml`

- [ ] **Step 1: Create dev profile**

Create `application-dev.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:safe_validator}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000

  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      timeout: 5000ms
      database: 0

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

jwt:
  secret: ${JWT_SECRET:dev-secret-change-me-in-prod-must-be-at-least-256-bits-long}
  access-token-ttl-seconds: 7200
  refresh-token-ttl-seconds: 604800
  issuer: safe-validator

logging:
  level:
    root: INFO
    com.safevalidator: DEBUG
    org.springframework.security: INFO
```

- [ ] **Step 2: Create prod profile**

Create `application-prod.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT:5432}/${DB_NAME}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 30
      minimum-idle: 5

  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD}

  flyway:
    enabled: true
    locations: classpath:db/migration

jwt:
  secret: ${JWT_SECRET}
  access-token-ttl-seconds: 7200
  refresh-token-ttl-seconds: 604800
  issuer: safe-validator

logging:
  level:
    root: WARN
    com.safevalidator: INFO
```

- [ ] **Step 3: Verify both profiles load**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-start compile
```

- [ ] **Step 4: Commit**

```bash
cd backend
git add safe-validator-start
git commit -m "feat(start): add dev and prod profile configurations"
```

---

## Task 2.9: Flyway V1 migration - metadata tables

**Files:**
- Create: `backend/safe-validator-start/src/main/resources/db/migration/V1__init_metadata_tables.sql`

- [ ] **Step 1: Create migration directory and file**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-start/src/main/resources/db/migration
```

Create `V1__init_metadata_tables.sql`:

```sql
-- =====================================================
-- V1: Initialize metadata tables for safe-validator
-- =====================================================

-- User table
CREATE TABLE sys_user (
    id            BIGINT       PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL,
    password      VARCHAR(128) NOT NULL,
    real_name     VARCHAR(64),
    email         VARCHAR(128),
    phone         VARCHAR(32),
    status        SMALLINT     NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP,
    create_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by     BIGINT,
    update_by     BIGINT,
    deleted       SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_user_username ON sys_user(username) WHERE deleted = 0;
CREATE INDEX idx_sys_user_email ON sys_user(email) WHERE deleted = 0;

-- Role table
CREATE TABLE sys_role (
    id          BIGINT       PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL,
    name        VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    status      SMALLINT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_role_code ON sys_role(code) WHERE deleted = 0;

-- Permission table
CREATE TABLE sys_permission (
    id          BIGINT       PRIMARY KEY,
    parent_id   BIGINT       NOT NULL DEFAULT 0,
    code        VARCHAR(128) NOT NULL,
    name        VARCHAR(128) NOT NULL,
    type        VARCHAR(16)  NOT NULL,
    path        VARCHAR(256),
    icon        VARCHAR(64),
    sort_order  INT          NOT NULL DEFAULT 0,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_permission_code ON sys_permission(code) WHERE deleted = 0;

-- User-Role association
CREATE TABLE sys_user_role (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- Role-Permission association
CREATE TABLE sys_role_permission (
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- Audit log table
CREATE TABLE sys_audit_log (
    id          BIGINT       PRIMARY KEY,
    user_id     BIGINT,
    username    VARCHAR(64),
    module      VARCHAR(64)  NOT NULL,
    action      VARCHAR(64)  NOT NULL,
    resource_id VARCHAR(128),
    method      VARCHAR(8),
    path        VARCHAR(256),
    ip          VARCHAR(64),
    user_agent  VARCHAR(512),
    status      SMALLINT     NOT NULL DEFAULT 1,
    error_msg   TEXT,
    cost_ms     BIGINT,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_sys_audit_user ON sys_audit_log(user_id, create_time DESC);
CREATE INDEX idx_sys_audit_module ON sys_audit_log(module, create_time DESC);

-- Dict table
CREATE TABLE sys_dict (
    id          BIGINT       PRIMARY KEY,
    code        VARCHAR(64)  NOT NULL,
    name        VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_sys_dict_code ON sys_dict(code) WHERE deleted = 0;

CREATE TABLE sys_dict_item (
    id          BIGINT       PRIMARY KEY,
    dict_id     BIGINT       NOT NULL,
    label       VARCHAR(128) NOT NULL,
    value       VARCHAR(128) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    status      SMALLINT     NOT NULL DEFAULT 1,
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_by   BIGINT,
    update_by   BIGINT,
    deleted     SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_sys_dict_item_dict ON sys_dict_item(dict_id);
```

- [ ] **Step 2: Verify migration is syntactically valid**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-start process-resources
```

Expected: file copied to `target/classes/db/migration/`

- [ ] **Step 3: Commit**

```bash
cd backend
git add safe-validator-start/src/main/resources/db/migration
git commit -m "feat(db): add V1 migration for metadata tables"
```

---

## Task 2.10: Flyway V2 migration - seed data

**Files:**
- Create: `backend/safe-validator-start/src/main/resources/db/migration/V2__seed_admin_data.sql`

- [ ] **Step 1: Create seed migration**

Create `V2__seed_admin_data.sql`. **Note**: password is `admin123` BCrypt-hashed with strength 10:

```sql
-- =====================================================
-- V2: Seed admin user, default role, base permissions
-- =====================================================

-- Admin user (password: admin123, BCrypt strength 10)
INSERT INTO sys_user (id, username, password, real_name, status, create_time, update_time, deleted)
VALUES (1, 'admin', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE8ByOhJIrdAu2', 'Administrator', 1,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);

-- Default roles
INSERT INTO sys_role (id, code, name, description, status, create_time, update_time, deleted) VALUES
    (1, 'admin',    '系统管理员', '拥有所有权限',                 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (2, 'operator', '操作员',     '日常操作权限，不含用户管理',   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);

-- Assign admin role to admin user
INSERT INTO sys_user_role (user_id, role_id) VALUES (1, 1);

-- Base permissions
INSERT INTO sys_permission (id, parent_id, code, name, type, sort_order, create_time, update_time, deleted) VALUES
    (1,  0, 'system',     '系统管理',  'menu',  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (10, 1, 'system:user',     '用户管理', 'menu',  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (11, 10, 'system:user:list',   '查看用户', 'action', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (12, 10, 'system:user:create', '创建用户', 'action', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (13, 10, 'system:user:update', '更新用户', 'action', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (14, 10, 'system:user:delete', '删除用户', 'action', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (20, 1, 'system:role',     '角色管理', 'menu',  2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (21, 20, 'system:role:list',   '查看角色', 'action', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (22, 20, 'system:role:create', '创建角色', 'action', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (23, 20, 'system:role:update', '更新角色', 'action', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (24, 20, 'system:role:delete', '删除角色', 'action', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);

-- Bind all permissions to admin role
INSERT INTO sys_role_permission (role_id, permission_id) VALUES
    (1, 1), (1, 10), (1, 11), (1, 12), (1, 13), (1, 14),
    (1, 20), (1, 21), (1, 22), (1, 23), (1, 24);
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add safe-validator-start/src/main/resources/db/migration
git commit -m "feat(db): add V2 seed migration with admin user and base permissions"
```

---

## Task 2.11: Verify Flyway end-to-end with postgres container

This task runs the actual migrations to confirm SQL is valid. Requires Docker available locally.

- [ ] **Step 1: Start postgres container**

```bash
docker run -d --name sv-postgres-test \
    -e POSTGRES_DB=safe_validator \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 \
    postgres:16-alpine
```

- [ ] **Step 2: Run migrations**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-start flyway:migrate \
    -Dflyway.url=jdbc:postgresql://localhost:5432/safe_validator \
    -Dflyway.user=postgres \
    -Dflyway.password=postgres \
    -Dflyway.locations=filesystem:src/main/resources/db/migration
```

Expected: 2 migrations applied successfully.

- [ ] **Step 3: Verify tables exist**

```bash
docker exec sv-postgres-test psql -U postgres -d safe_validator -c "\dt"
```

Expected: 8 tables listed (`sys_user`, `sys_role`, etc.)

- [ ] **Step 4: Verify seed data**

```bash
docker exec sv-postgres-test psql -U postgres -d safe_validator -c "SELECT username, status FROM sys_user;"
```

Expected: `admin | 1`

- [ ] **Step 5: Stop and remove test container**

```bash
docker stop sv-postgres-test && docker rm sv-postgres-test
```

---

## Task 2.12: Phase 2 verification

- [ ] **Step 1: Confirm common module structure**

```bash
cd /home/cris/dev/safeValidator/backend
find safe-validator-common/src -type f
```

Expected: 10+ files including `Result.java`, `ErrorCode.java`, `BizException.java`, `GlobalExceptionHandler.java`, `BaseEntity.java`, `PageQuery.java`, `PageResult.java`, `BaseJsonbTypeHandler.java`, `JsonbNodeTypeHandler.java`.

- [ ] **Step 2: Confirm migrations in place**

```bash
ls -1 safe-validator-start/src/main/resources/db/migration/
```

Expected:
```
V1__init_metadata_tables.sql
V2__seed_admin_data.sql
```

- [ ] **Step 3: Full build verification**

```bash
cd /home/cris/dev/safeValidator/backend
mvn clean compile
```

Expected: `BUILD SUCCESS` for all 4 modules.

- [ ] **Step 4: Commit any final changes**

```bash
cd backend
git status
# If anything uncommitted:
git add -A && git commit -m "chore: phase 2 final"
```

**Phase 2 complete.** Proceed to [Part 3: Security & Admin APIs](./2026-06-25-infrastructure-layer-part3-security-admin.md).
