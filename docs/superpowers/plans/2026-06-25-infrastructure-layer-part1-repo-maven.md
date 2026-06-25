# Part 1: Repository & Maven Skeleton

**Phase:** 1 of 7
**Tasks:** 1.1 – 1.8
**End state:** `mvn -pl safe-validator-start compile` succeeds; all 4 modules visible in IDE; meta repo + backend repo + frontend repo all initialized.

---

## Task 1.1: Initialize backend git repository

**Files:**
- Create: `backend/.gitignore`

- [ ] **Step 1: Create backend directory and init git**

```bash
cd /home/cris/dev/safeValidator
mkdir -p backend
cd backend
git init -b main
```

- [ ] **Step 2: Create `backend/.gitignore`**

```gitignore
# Maven
target/
*.class
*.jar
*.war
hs_err_pid*

# IDE
.idea/
.vscode/
*.iml
*.iws
*.ipr

# Logs
logs/
*.log

# Env
.env
.env.local

# System
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Initial commit**

```bash
cd backend
git add .gitignore
git commit -m "chore: initialize backend repo"
```

---

## Task 1.2: Initialize frontend git repository

**Files:**
- Create: `frontend/.gitignore`

- [ ] **Step 1: Create frontend directory and init git**

```bash
cd /home/cris/dev/safeValidator
mkdir -p frontend
cd frontend
git init -b main
```

- [ ] **Step 2: Create `frontend/.gitignore`**

```gitignore
# Node
node_modules/
dist/
.vite/
*.local

# Logs
logs/
*.log
pnpm-debug.log*

# Env
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.iml

# System
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Initial commit**

```bash
cd frontend
git add .gitignore
git commit -m "chore: initialize frontend repo"
```

---

## Task 1.3: Create parent Maven POM

**Files:**
- Create: `backend/pom.xml`

- [ ] **Step 1: Create parent `pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.5</version>
        <relativePath/>
    </parent>

    <groupId>com.safevalidator</groupId>
    <artifactId>safe-validator-parent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    <name>safe-validator-parent</name>
    <description>Form engine platform</description>

    <modules>
        <module>safe-validator-common</module>
        <module>safe-validator-admin</module>
        <module>safe-validator-form</module>
        <module>safe-validator-start</module>
    </modules>

    <properties>
        <java.version>17</java.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

        <mybatis-plus.version>3.5.9</mybatis-plus.version>
        <jjwt.version>0.12.6</jjwt.version>
        <springdoc.version>2.6.0</springdoc.version>
        <flyway.version>10.20.1</flyway.version>
        <hutool.version>5.8.32</hutool.version>
        <mapstruct.version>1.6.3</mapstruct.version>
        <logstash-encoder.version>8.0</logstash-encoder.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.safevalidator</groupId>
                <artifactId>safe-validator-common</artifactId>
                <version>${project.version}</version>
            </dependency>
            <dependency>
                <groupId>com.safevalidator</groupId>
                <artifactId>safe-validator-admin</artifactId>
                <version>${project.version}</version>
            </dependency>
            <dependency>
                <groupId>com.safevalidator</groupId>
                <artifactId>safe-validator-form</artifactId>
                <version>${project.version}</version>
            </dependency>

            <dependency>
                <groupId>com.baomidou</groupId>
                <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
                <version>${mybatis-plus.version}</version>
            </dependency>
            <dependency>
                <groupId>com.baomidou</groupId>
                <artifactId>mybatis-plus-generator</artifactId>
                <version>${mybatis-plus.version}</version>
            </dependency>

            <dependency>
                <groupId>io.jsonwebtoken</groupId>
                <artifactId>jjwt-api</artifactId>
                <version>${jjwt.version}</version>
            </dependency>
            <dependency>
                <groupId>io.jsonwebtoken</groupId>
                <artifactId>jjwt-impl</artifactId>
                <version>${jjwt.version}</version>
            </dependency>
            <dependency>
                <groupId>io.jsonwebtoken</groupId>
                <artifactId>jjwt-jackson</artifactId>
                <version>${jjwt.version}</version>
            </dependency>

            <dependency>
                <groupId>org.springdoc</groupId>
                <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
                <version>${springdoc.version}</version>
            </dependency>

            <dependency>
                <groupId>org.flywaydb</groupId>
                <artifactId>flyway-core</artifactId>
                <version>${flyway.version}</version>
            </dependency>
            <dependency>
                <groupId>org.flywaydb</groupId>
                <artifactId>flyway-database-postgresql</artifactId>
                <version>${flyway.version}</version>
            </dependency>

            <dependency>
                <groupId>cn.hutool</groupId>
                <artifactId>hutool-all</artifactId>
                <version>${hutool.version}</version>
            </dependency>

            <dependency>
                <groupId>org.mapstruct</groupId>
                <artifactId>mapstruct</artifactId>
                <version>${mapstruct.version}</version>
            </dependency>
            <dependency>
                <groupId>org.mapstruct</groupId>
                <artifactId>mapstruct-processor</artifactId>
                <version>${mapstruct.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

- [ ] **Step 2: Verify parent POM is valid**

```bash
cd /home/cris/dev/safeValidator/backend
mvn validate
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit parent POM**

```bash
cd backend
git add pom.xml
git commit -m "feat: add parent Maven POM with 4-module skeleton"
```

---

## Task 1.4: Create safe-validator-common module skeleton

**Files:**
- Create: `backend/safe-validator-common/pom.xml`
- Create: `backend/safe-validator-common/src/main/java/com/safevalidator/common/CommonMarker.java` (temporary marker; removed in Phase 2)

- [ ] **Step 1: Create common module POM**

Create `backend/safe-validator-common/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.safevalidator</groupId>
        <artifactId>safe-validator-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <artifactId>safe-validator-common</artifactId>
    <name>safe-validator-common</name>
    <description>Common utilities, exceptions, base entities, JSONB type handlers</description>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>cn.hutool</groupId>
            <artifactId>hutool-all</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 2: Create package directory and marker file**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-common/src/main/java/com/safevalidator/common
```

Create `CommonMarker.java`:

```java
package com.safevalidator.common;

/**
 * Temporary marker to satisfy Maven compile until Phase 2 replaces this file.
 * Will be deleted in Task 2.1.
 */
final class CommonMarker {
    private CommonMarker() {}
}
```

- [ ] **Step 3: Verify common module compiles**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-common compile
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
cd backend
git add safe-validator-common
git commit -m "feat(common): scaffold safe-validator-common module"
```

---

## Task 1.5: Create safe-validator-admin module skeleton

**Files:**
- Create: `backend/safe-validator-admin/pom.xml`
- Create: `backend/safe-validator-admin/src/main/java/com/safevalidator/admin/AdminMarker.java`

- [ ] **Step 1: Create admin module POM**

Create `backend/safe-validator-admin/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.safevalidator</groupId>
        <artifactId>safe-validator-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <artifactId>safe-validator-admin</artifactId>
    <name>safe-validator-admin</name>
    <description>User/role/permission management, JWT auth, audit logs</description>

    <dependencies>
        <dependency>
            <groupId>com.safevalidator</groupId>
            <artifactId>safe-validator-common</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 2: Create marker file**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-admin/src/main/java/com/safevalidator/admin
```

Create `AdminMarker.java`:

```java
package com.safevalidator.admin;

/** Temporary marker; replaced by real classes in Phase 3. */
final class AdminMarker {
    private AdminMarker() {}
}
```

- [ ] **Step 3: Verify compile**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-admin compile
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
cd backend
git add safe-validator-admin
git commit -m "feat(admin): scaffold safe-validator-admin module"
```

---

## Task 1.6: Create safe-validator-form module skeleton

**Files:**
- Create: `backend/safe-validator-form/pom.xml`
- Create: `backend/safe-validator-form/src/main/java/com/safevalidator/form/FormMarker.java`

- [ ] **Step 1: Create form module POM**

Create `backend/safe-validator-form/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.safevalidator</groupId>
        <artifactId>safe-validator-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <artifactId>safe-validator-form</artifactId>
    <name>safe-validator-form</name>
    <description>Form schema engine, dynamic SQL, field mapping, validation (placeholder for sub-project 2)</description>

    <dependencies>
        <dependency>
            <groupId>com.safevalidator</groupId>
            <artifactId>safe-validator-common</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>
</project>
```

- [ ] **Step 2: Create marker file**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-form/src/main/java/com/safevalidator/form
```

Create `FormMarker.java`:

```java
package com.safevalidator.form;

/** Temporary marker; real classes added in sub-project 2. */
final class FormMarker {
    private FormMarker() {}
}
```

- [ ] **Step 3: Verify compile**

```bash
cd /home/cris/dev/safeValidator/backend
mvn -pl safe-validator-form compile
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
cd backend
git add safe-validator-form
git commit -m "feat(form): scaffold safe-validator-form module (placeholder)"
```

---

## Task 1.7: Create safe-validator-start module skeleton

**Files:**
- Create: `backend/safe-validator-start/pom.xml`
- Create: `backend/safe-validator-start/src/main/java/com/safevalidator/start/StartMarker.java`
- Create: `backend/safe-validator-start/src/main/resources/application.yml`

- [ ] **Step 1: Create start module POM**

Create `backend/safe-validator-start/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.safevalidator</groupId>
        <artifactId>safe-validator-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <artifactId>safe-validator-start</artifactId>
    <name>safe-validator-start</name>
    <description>Spring Boot application entry point</description>

    <dependencies>
        <dependency>
            <groupId>com.safevalidator</groupId>
            <artifactId>safe-validator-common</artifactId>
        </dependency>
        <dependency>
            <groupId>com.safevalidator</groupId>
            <artifactId>safe-validator-admin</artifactId>
        </dependency>
        <dependency>
            <groupId>com.safevalidator</groupId>
            <artifactId>safe-validator-form</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
        </dependency>

        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>

        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        </dependency>

        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>

    <build>
        <finalName>safe-validator-start</finalName>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: Create marker and base config**

```bash
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-start/src/main/java/com/safevalidator/start
mkdir -p /home/cris/dev/safeValidator/backend/safe-validator-start/src/main/resources
```

Create `StartMarker.java`:

```java
package com.safevalidator.start;

/** Temporary marker; replaced by SafeValidatorApplication in Task 4.1. */
final class StartMarker {
    private StartMarker() {}
}
```

Create `application.yml`:

```yaml
spring:
  application:
    name: safe-validator
  profiles:
    active: dev
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: GMT+8
    default-property-inclusion: non_null

server:
  port: 8080
  servlet:
    context-path: /

mybatis-plus:
  mapper-locations: classpath*:/mapper/**/*.xml
  type-aliases-package: com.safevalidator.**.entity
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.slf4j.Slf4jImpl
  global-config:
    db-config:
      id-type: ASSIGN_ID
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0

springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
    operations-sorter: alpha
    tags-sorter: alpha

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

- [ ] **Step 3: Verify full parent build compiles**

```bash
cd /home/cris/dev/safeValidator/backend
mvn clean compile
```

Expected: `BUILD SUCCESS` for all 4 modules

- [ ] **Step 4: Commit**

```bash
cd backend
git add safe-validator-start
git commit -m "feat(start): scaffold safe-validator-start module with base config"
```

---

## Task 1.8: Phase 1 verification

- [ ] **Step 1: Confirm module structure**

```bash
cd /home/cris/dev/safeValidator/backend
ls -1
```

Expected output:
```
pom.xml
safe-validator-common
safe-validator-admin
safe-validator-form
safe-validator-start
```

- [ ] **Step 2: Confirm git status**

```bash
cd /home/cris/dev/safeValidator/backend
git log --oneline
```

Expected: 5 commits (initial + 4 module scaffolds).

- [ ] **Step 3: Confirm parent meta repo**

```bash
cd /home/cris/dev/safeValidator
git log --oneline
```

Expected: 1 commit (the design doc).

**Phase 1 complete.** Proceed to [Part 2: Common Module & Database](./2026-06-25-infrastructure-layer-part2-common-database.md).
