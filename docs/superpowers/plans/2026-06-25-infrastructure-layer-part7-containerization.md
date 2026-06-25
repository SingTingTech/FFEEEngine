# Part 7: Containerization & Verification

**Phase:** 7 of 7
**Tasks:** 7.1 – 7.6
**End state:** `docker compose up -d` boots the full stack; `http://localhost:5173` login works; `http://localhost:8080/swagger-ui.html` shows API docs.

**Pre-requisite:** Phases 1–6 complete.

---

## Task 7.1: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# syntax=docker/dockerfile:1.7
ARG MAVEN_BASE=azul/zulu-openjdk-alpine:17
ARG RUNTIME_BASE_JRE=azul/zulu-openjdk-alpine:17-jre
ARG RUNTIME_BASE_JDK=azul/zulu-openjdk-alpine:17

# ========== 构建阶段（Azul Zulu + Maven）==========
FROM ${MAVEN_BASE} AS builder

ARG MAVEN_VERSION=3.9.9
RUN apk add --no-cache curl bash \
    && curl -fsSL https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
       | tar xz -C /opt \
    && ln -s /opt/apache-maven-${MAVEN_VERSION}/bin/mvn /usr/local/bin/mvn

ENV MAVEN_HOME=/opt/apache-maven-${MAVEN_VERSION}
WORKDIR /build

# 分层拷贝：先只拷贝 pom 文件，让 Maven 解析依赖时缓存生效
COPY pom.xml .
COPY safe-validator-common/pom.xml safe-validator-common/
COPY safe-validator-admin/pom.xml  safe-validator-admin/
COPY safe-validator-form/pom.xml   safe-validator-form/
COPY safe-validator-start/pom.xml  safe-validator-start/
RUN mvn -B -q dependency:go-offline

COPY . .
RUN mvn clean package -DskipTests -B \
    -pl safe-validator-start -am

# ========== 生产运行阶段（JRE）==========
FROM ${RUNTIME_BASE_JRE} AS prod
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /build/safe-validator-start/target/safe-validator-start.jar /app/app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]

# ========== 调试运行阶段（JDK + JDWP）==========
FROM ${RUNTIME_BASE_JDK} AS debug
WORKDIR /app
RUN apk add --no-cache curl bash \
    && addgroup -S app && adduser -S app -G app
COPY --from=builder /build/safe-validator-start/target/safe-validator-start.jar /app/app.jar

USER app
EXPOSE 8080 5005

ENV JAVA_TOOL_OPTIONS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
```

- [ ] **Step 2: Verify backend builds (prod target)**

```bash
cd /home/cris/dev/safeValidator/backend
docker build --target prod -t safe-validator-backend:prod .
```

Expected: `Successfully tagged safe-validator-backend:prod`

- [ ] **Step 3: Verify backend builds (debug target)**

```bash
cd /home/cris/dev/safeValidator/backend
docker build --target debug -t safe-validator-backend:debug .
```

Expected: `Successfully tagged safe-validator-backend:debug`

- [ ] **Step 4: Verify image sizes**

```bash
docker images | grep safe-validator-backend
```

Expected: prod ~250MB, debug ~450MB

- [ ] **Step 5: Commit**

```bash
cd backend
git add Dockerfile
git commit -m "feat(docker): add multi-stage Dockerfile with prod/debug targets"
```

---

## Task 7.2: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# syntax=docker/dockerfile:1.7

# ========== 构建阶段 ==========
FROM node:20-alpine AS builder
WORKDIR /app

# 先拷贝 workspace 配置 + 锁文件，分层缓存 pnpm install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY tsconfig.base.json tsconfig.json ./
COPY apps/platform-admin/package.json apps/platform-admin/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/form-embeddable/package.json packages/form-embeddable/

RUN pnpm install --frozen-lockfile

# 拷贝源代码并构建
COPY apps/platform-admin apps/platform-admin
COPY packages/shared-types packages/shared-types
COPY packages/form-embeddable packages/form-embeddable

RUN pnpm --filter platform-admin build

# ========== 运行阶段（Nginx）==========
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# 删除默认页面
RUN rm -rf ./*

# 拷贝 Vite 构建产物
COPY --from=builder /app/apps/platform-admin/dist .

# 拷贝 nginx 配置
COPY apps/platform-admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Verify build**

```bash
cd /home/cris/dev/safeValidator/frontend
docker build -t safe-validator-frontend:latest .
```

Expected: `Successfully tagged safe-validator-frontend:latest`

- [ ] **Step 3: Commit (after Task 7.3 adds nginx.conf)**

---

## Task 7.3: Nginx configuration for frontend

**Files:**
- Create: `frontend/apps/platform-admin/nginx.conf`

- [ ] **Step 1: Create nginx.conf**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    # API 反向代理
    location /api/ {
        proxy_pass http://backend:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # 长缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback：所有未匹配请求返回 index.html（让 React Router 处理）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Verify frontend image still builds (test the nginx config)**

```bash
cd /home/cris/dev/safeValidator/frontend
docker build -t safe-validator-frontend:latest .
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add Dockerfile apps/platform-admin/nginx.conf
git commit -m "feat(docker): add frontend Dockerfile and nginx config"
```

---

## Task 7.4: docker-compose.yml

**Files:**
- Create: `docker-compose.yml` (workspace root)

- [ ] **Step 1: Create docker-compose.yml**

```yaml
# safeValidator full stack
# - Pure backend dev: `docker compose up -d postgres redis`, run backend locally via mvn
# - Full stack:        `docker compose up -d`
# - Backend debug:     `BACKEND_TARGET=debug BACKEND_TAG=debug docker compose up -d`

services:
  postgres:
    image: postgres:16-alpine
    container_name: sv-postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-safe_validator}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sv-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    image: safe-validator-backend:${BACKEND_TAG:-prod}
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: ${BACKEND_TARGET:-prod}
    container_name: sv-backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-dev}
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-safe_validator}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set, copy from .env.example}
    ports:
      - "8080:8080"
      - "5005:5005"   # 仅在 BACKEND_TARGET=debug 时使用
    volumes:
      - ./backend/logs:/app/logs

  frontend:
    image: safe-validator-frontend:latest
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sv-frontend
    depends_on:
      - backend
    ports:
      - "5173:80"

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 2: Commit**

```bash
cd /home/cris/dev/safeValidator
git add docker-compose.yml
git commit -m "feat(docker): add docker-compose with prod/debug backend toggle"
```

---

## Task 7.5: .env.example files

**Files:**
- Create: `frontend/.env.example`
- Create: `backend/.env.example`

- [ ] **Step 1: Create frontend .env.example**

```bash
# Copy to .env and fill values
# VITE_API_BASE=/api  # leave default for dev (vite proxy); for prod build use full URL
```

- [ ] **Step 2: Create backend .env.example**

```bash
# safeValidator backend environment template
# Copy to backend/.env and fill values, or export before running

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safe_validator
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (REQUIRED for prod, MUST be at least 256 bits / 32 bytes)
# Generate with: openssl rand -base64 32
JWT_SECRET=replace-me-with-a-strong-secret-at-least-32-bytes-long

# Spring profile
SPRING_PROFILES_ACTIVE=dev
```

- [ ] **Step 3: Commit**

```bash
cd /home/cris/dev/safeValidator
git add backend/.env.example frontend/.env.example
git commit -m "chore: add .env.example templates for backend and frontend"
```

---

## Task 7.6: End-to-end smoke test

- [ ] **Step 1: Start full stack**

```bash
cd /home/cris/dev/safeValidator

# Generate strong JWT secret
export JWT_SECRET=$(openssl rand -base64 48)

docker compose up -d --build
```

Expected: 4 containers running (`sv-postgres`, `sv-redis`, `sv-backend`, `sv-frontend`).

- [ ] **Step 2: Wait for backend to be healthy**

```bash
for i in $(seq 1 60); do
  if curl -s http://localhost:8080/actuator/health 2>/dev/null | grep -q UP; then
    echo "Backend ready after ${i} attempts"
    break
  fi
  sleep 2
done
```

- [ ] **Step 3: Check container status**

```bash
docker compose ps
```

Expected: all 4 services `running` or `healthy`.

- [ ] **Step 4: View backend logs**

```bash
docker compose logs backend | tail -30
```

Look for: `Started SafeValidatorApplication` and no ERROR lines.

- [ ] **Step 5: Test frontend serves**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173
```

Expected: `200`

- [ ] **Step 6: Test login via frontend proxy**

```bash
curl -s -X POST http://localhost:5173/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq '.code, .data.accessToken | length'
```

Expected: `0` and a long base64 string.

- [ ] **Step 7: Test full user CRUD via frontend proxy**

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.accessToken')

# Create
curl -s -X POST http://localhost:5173/api/admin/users \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"username":"smoketest","password":"test1234","realName":"冒烟测试","email":"test@x.com","status":1,"roleIds":[2]}'
echo "---"

# List
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/admin/users | jq '.code, .data.total'
```

Expected: total = 2 (admin + smoketest).

- [ ] **Step 8: Test Swagger UI**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/swagger-ui.html
```

Expected: `200`

- [ ] **Step 9: Test debug mode**

```bash
BACKEND_TARGET=debug BACKEND_TAG=debug docker compose up -d --build backend
docker compose logs backend | grep -i jdwp
```

Expected: line containing `jdwp=transport=dt_socket`.

Test JDWP port:

```bash
nc -zv localhost 5005
```

Expected: `Connection to localhost 5005 port [tcp/*] succeeded!`

- [ ] **Step 10: Final cleanup**

```bash
docker compose down -v
```

Expected: all containers removed, volumes cleaned.

- [ ] **Step 11: Final commit**

```bash
cd /home/cris/dev/safeValidator
git status
git add -A
git commit -m "chore: infrastructure layer complete — verified end-to-end" --allow-empty
```

- [ ] **Step 12: Final repo summary**

```bash
cd /home/cris/dev/safeValidator
echo "=== META REPO (designs) ==="
git log --oneline
echo ""
echo "=== BACKEND REPO ==="
cd backend
git log --oneline
echo ""
echo "=== FRONTEND REPO ==="
cd ../frontend
git log --oneline
```

Expected:
- Meta repo: ~10 commits (design doc + plan files + docker-compose)
- Backend repo: ~25 commits (4 modules + admin APIs + Docker)
- Frontend repo: ~12 commits (monorepo + pages + Docker)

---

## All Phases Complete

The infrastructure layer is fully working:

✓ Backend (Java 17 + Spring Boot 3.3 + MyBatis-Plus + JWT)
✓ Frontend (Vite + React 18 + TS + Ant Design 5 + TanStack Query + Zustand)
✓ Database (PostgreSQL 16 + Flyway migrations + seed data)
✓ Cache & blacklist (Redis 7)
✓ Containerization (Azul Zulu multi-stage, prod/debug targets, docker-compose)
✓ Logging (Logback profile-based)
✓ API docs (SpringDoc OpenAPI + Swagger UI)

**Verified smoke tests:**
- `docker compose up -d` boots full stack
- Login as `admin/admin123` returns JWT
- User CRUD via REST works
- Role CRUD with permission tree works
- Frontend serves on `http://localhost:5173`
- Swagger UI accessible on `http://localhost:8080/swagger-ui.html`
- JDWP debug port 5005 works when `BACKEND_TARGET=debug`

**Ready for sub-project 2 (form schema backend engine).**
