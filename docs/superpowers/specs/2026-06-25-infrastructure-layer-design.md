# 基础设施层设计 · safeValidator

| 项目 | safeValidator |
|---|---|
| 文档版本 | 1.0 |
| 日期 | 2026-06-25 |
| 范围 | **基础设施层**（子项目 1 / 4）|
| 子项目列表 | 1. 基础设施层（本设计）<br/>2. 表单 Schema 与后端引擎<br/>3. 表单设计器前端<br/>4. 嵌入组件库 |

---

## 1. 背景与目标

### 1.1 项目定位

safeValidator 是一个独立的表单引擎平台，提供：

- **表单设计器**：拖拽式 schema 编辑，支持嵌套（一对一 / 一对多）
- **表单运行后端**：schema 存储、字段映射（关系表 / JSONB 双模）、校验执行
- **嵌入组件库**：可被其他应用嵌入的填写 / 展示 / 列表组件

### 1.2 基础设施层的边界

**本设计只覆盖基础设施层**——即搭建前后端框架、容器化、认证骨架等"地基"。

**不包含**：
- 表单 schema 的具体定义（子项目 2）
- 表单设计器的拖拽 UI（子项目 3）
- 嵌入组件库的具体实现（子项目 4）

**包含**：
- 前后端仓库结构
- 完整可启动、可登录、可做用户管理的最小骨架
- 容器化（docker-compose）
- 后续 4 个子项目都要遵守的"规约"（错误格式、日志、鉴权、目录结构）

### 1.3 启动验证清单（基础设施层完成定义）

- [ ] `docker compose up -d` 启动后，`http://localhost:5173` 能打开登录页
- [ ] `http://localhost:8080/swagger-ui.html` 能看到 API 文档
- [ ] 用种子账号 `admin/admin123` 登录成功
- [ ] 能进入用户管理页面，创建 / 编辑 / 删除用户
- [ ] 角色管理页面可绑定权限到角色
- [ ] 删除容器 `docker compose down -v`，再 `up`，Flyway 自动重建 schema

---

## 2. 仓库结构

### 2.1 两个独立仓

```
~/dev/safeValidator/                        # 工作目录根（设计/规划 meta 仓）
├── docs/                                   # 设计文档、计划、笔记
├── backend/                                # Spring Boot 后端仓（独立 git）
└── frontend/                               # 前端 monorepo 仓（独立 git）
```

### 2.2 `backend/` 仓结构

```
backend/
├── pom.xml                                 # 父 pom（统一依赖版本）
├── safe-validator-common/                  # 通用工具、异常、基类
├── safe-validator-admin/                   # 用户/角色/认证/权限
├── safe-validator-form/                    # 表单引擎（占位，业务代码留子项目 2）
├── safe-validator-start/                   # 启动模块（main + application.yml）
├── docker/                                 # Dockerfile, docker-compose 模板
└── .env.example                            # 环境变量模板
```

### 2.3 `frontend/` 仓结构

```
frontend/
├── package.json                            # workspaces: ["apps/*", "packages/*"]
├── pnpm-workspace.yaml
├── tsconfig.base.json                      # 共享 TS strict 配置
├── apps/
│   └── platform-admin/                     # 管理后台（含登录、用户管理、角色管理）
└── packages/
    ├── form-embeddable/                    # 嵌入组件库（占位，子项目 4 实现）
    └── shared-types/                       # 前后端共享 TS 类型
```

### 2.4 模块依赖方向

```
                safe-validator-start
                       │
              ┌────────┴────────┐
              ▼                 ▼
   safe-validator-admin  safe-validator-form
              │                 │
              └────────┬────────┘
                       ▼
              safe-validator-common
```

**严格单向**：admin 不依赖 form，form 不依赖 admin。

---

## 3. 后端技术栈与模块职责

### 3.1 技术栈基线

| 维度 | 选型 | 版本 |
|---|---|---|
| JDK | Azul Zulu | 17 LTS |
| 构建 | Maven | 3.9.x |
| 框架 | Spring Boot | 3.3.x |
| 持久化（metadata）| MyBatis-Plus | 3.5.9+ |
| 持久化（form data）| MyBatis XML 动态 SQL | MyBatis 3.5.x |
| 数据库 | PostgreSQL | 16 |
| 迁移 | Flyway | 10.x |
| 安全 | Spring Security 6 + JJWT | jjwt 0.12.x |
| API 文档 | SpringDoc OpenAPI | 2.6.x |
| 工具 | Lombok + MapStruct + Hutool | — |
| 中间件 | Redis | 7 |
| 审计 | @EnableAsync + 自定义线程池 | — |

### 3.2 模块职责

**safe-validator-common**
- 统一响应封装 `Result<T>`
- 业务异常 `BizException(ErrorCode)`
- 全局异常处理器 `@RestControllerAdvice`
- 基础实体 `BaseEntity`（id, create_time, update_time, create_by, update_by, deleted）
- JSONB TypeHandler（`BaseJsonbTypeHandler<T>`）
- 安全工具类 `SecurityUtils.getCurrentUser()`
- 通用常量、错误码枚举

**safe-validator-admin**
- 用户 / 角色 / 权限 CRUD
- JWT 登录、登出、刷新
- 操作审计（异步落库）
- 字典 / 枚举管理
- 权限注解 `@PreAuthorize`

**safe-validator-form**（基础设施层只占位）
- 包结构预留：`form.schema` / `form.runtime` / `form.mapping` / `form.validation`
- 不写任何业务代码；具体实现在子项目 2

**safe-validator-start**
- `@SpringBootApplication` 入口
- `application.yml` + profile-specific 配置
- `@MapperScan` 扫描所有模块的 Mapper
- `@EnableAsync` 启用异步
- Logback 配置
- 不写业务代码

### 3.3 元数据表（基础设施层创建）

| 表 | 归属模块 | 说明 |
|---|---|---|
| `sys_user` | admin | 用户 |
| `sys_role` | admin | 角色 |
| `sys_permission` | admin | 权限 |
| `sys_user_role` | admin | 用户-角色 |
| `sys_role_permission` | admin | 角色-权限 |
| `sys_audit_log` | admin | 审计日志 |
| `sys_dict` / `sys_dict_item` | admin | 字典 |
| `flyway_schema_history` | flyway | 迁移记录 |

**约定**：
- 所有表都有 `id` (BIGINT)、`create_time`、`update_time`、`create_by`、`update_by`、`deleted`（逻辑删除标志）
- `BaseEntity` 抽象这些字段，MyBatis-Plus `MetaObjectHandler` 自动填充
- 主键策略：雪花算法（`IdType.ASSIGN_ID`）

### 3.4 认证授权

- **登录**：`POST /auth/login` → 校验密码 → 返回 `accessToken`(JWT, 2h) + `refreshToken`(JWT, 7d)
- **请求拦截**：`JwtAuthenticationFilter` 解析 Authorization 头 → 写入 SecurityContext
- **权限控制**：方法级 `@PreAuthorize("hasAuthority('form:create')")`
- **Token 撤销**：Redis 黑名单（登出时把 accessToken jti 加入黑名单，过期时间 = token 剩余有效期）
- **Refresh**：`POST /auth/refresh` 携带 refreshToken → 返回新 accessToken
- **跨域**：CORS 限定 dev: `http://localhost:5173`，prod 通过环境变量配置

### 3.5 统一响应格式

所有 API 都遵守：

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```

- 业务异常：`BizException(ErrorCode.USER_NOT_FOUND)` → 全局处理器转 Result
- 校验异常：`@Valid` 失败 → 提取字段错误
- 未捕获异常：500 + 通用错误消息 + 详细堆栈写日志

### 3.6 审计日志（异步落库）

- `@EnableAsync` 在 start 模块
- 自定义 `AuditExecutor`：core=2, max=8, queue=1000
- `AuditLogService.recordAsync(...)` 入队
- 后台线程消费 → 攒 100 条或 5 秒刷一次批量 INSERT
- 失败重试 3 次后写 Redis dead-letter list

### 3.7 配置管理

- `application.yml`：通用配置
- `application-dev.yml` / `application-prod.yml`：profile 特定配置
- 敏感信息：`${ENV_VAR}` 注入，**不提交到 git**
- `.env.example` 提交作为模板

---

## 4. 前端技术栈与 monorepo

### 4.1 技术栈

| 维度 | 选型 | 版本 |
|---|---|---|
| 包管理 | pnpm | 9.x |
| Monorepo | pnpm workspaces | 内置 |
| 构建 | Vite | 5.x |
| 框架 | React | 18.x |
| 语言 | TypeScript（strict）| 5.5+ |
| UI 库 | Ant Design | 5.x |
| 路由 | React Router | 6.x |
| Server state | TanStack Query | v5 |
| Client state | Zustand | 4.x |
| HTTP | axios | 1.x |
| 表单运行时 | Antd Form | — |
| 代码规范 | ESLint + Prettier + Husky + lint-staged | — |

### 4.2 应用与包

- `apps/platform-admin`：基础设施层实现 Login、User Management、Role Management
- `packages/form-embeddable`：基础设施层只建空包（占位）
- `packages/shared-types`：基础设施层只放 `Result<T>` / `PageQuery` / `PageResult<T>`

### 4.3 目录约定（feature-based）

```
src/
├── api/                     # 按业务域分目录
├── components/              # 跨页面通用组件
├── features/                # 按业务域分目录（页面内私有组件）
├── hooks/                   # 自定义 hooks
├── stores/                  # Zustand stores
├── routes/                  # 路由配置
├── layouts/                 # 布局组件
├── utils/
├── types/                   # 本地类型（跨业务用 shared-types）
├── App.tsx
└── main.tsx
```

### 4.4 关键约定

**HTTP 客户端统一封装**：

```ts
// api/http.ts
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

**Query 与 Mutation 约定**：

```ts
export const useUserList = (query: PageQuery) =>
  useQuery({
    queryKey: ['users', 'list', query],
    queryFn: () => userApi.list(query),
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'list'] }),
  });
};
```

**路由守卫**：

```tsx
export const RequireAuth = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" />;
  return children;
};
```

### 4.5 Vite 开发代理

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, '')
    }
  }
}
```

### 4.6 容器化

- 前端 Dockerfile：多阶段（node:20-alpine 构建 → nginx:1.27-alpine 运行）
- nginx 配置：`/api/*` 反向代理到 `backend:8080`，其他路径返回静态文件 + SPA fallback

---

## 5. 容器化、日志与开发工作流

### 5.1 后端 Dockerfile

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
COPY --from=builder /build/safe-validator-start/target/*.jar /app/app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseG1GC", "-jar", "/app/app.jar"]

# ========== 调试运行阶段（JDK + JDWP）==========
FROM ${RUNTIME_BASE_JDK} AS debug
WORKDIR /app
RUN apk add --no-cache curl bash \
    && addgroup -S app && adduser -S app -G app
COPY --from=builder /build/safe-validator-start/target/*.jar /app/app.jar

USER app
EXPOSE 8080 5005

ENV JAVA_TOOL_OPTIONS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
ENTRYPOINT ["java", "-XX:+UseG1GC", "-jar", "/app/app.jar"]
```

### 5.2 构建命令

```bash
docker build --target prod  -t safe-validator-backend:prod  .   # 生产
docker build --target debug -t safe-validator-backend:debug .   # 调试
```

### 5.3 docker-compose.yml 模板

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: sv-postgres
    environment:
      POSTGRES_DB: safe_validator
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sv-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports: ["6379:6379"]
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
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    environment:
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-dev}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-me-in-prod}
      BACKEND_TAG: ${BACKEND_TAG:-prod}
    ports:
      - "8080:8080"
      - "5005:5005"
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
    ports: ["5173:80"]

volumes:
  postgres_data:
  redis_data:
```

### 5.4 开发工作流

| 场景 | 命令 |
|---|---|
| 纯后端开发 | `docker compose up -d postgres redis` + IDE 启动 `safe-validator-start` |
| 全栈联调（prod 镜像）| `docker compose up -d` |
| 后端远程调试 | `BACKEND_TARGET=debug BACKEND_TAG=debug docker compose up -d` + IDE 配 Remote JVM Debug `localhost:5005` |

### 5.5 日志策略

```xml
<!-- logback-spring.xml -->
<configuration>
  <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>logs/safe-validator.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
      <maxFileSize>100MB</maxFileSize>
      <maxHistory>30</maxHistory>
    </rollingPolicy>
    <encoder>
      <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="CONSOLE"/>
    <appender-ref ref="FILE"/>
  </root>

  <logger name="com.safevalidator" level="DEBUG"/>
  <logger name="org.springframework.security" level="INFO"/>
  <logger name="org.hibernate" level="INFO"/>
</configuration>
```

| Level | 用途 |
|---|---|
| ERROR | 业务异常、系统异常 |
| WARN | 参数校验失败、权限不足 |
| INFO | 关键业务节点（登录、CRUD）|
| DEBUG | SQL、请求/响应详情（dev profile）|

### 5.6 git 排除

`.gitignore`（根目录）：

```
backend/target/
backend/.env
backend/logs/
frontend/node_modules/
frontend/dist/
.idea/
.vscode/
*.iml
.DS_Store
```

---

## 6. 决策汇总

| 维度 | 决策 |
|---|---|
| 仓库结构 | 2 仓：backend（Maven 4 模块）+ frontend（pnpm monorepo）|
| 后端栈 | Java 17 (Azul Zulu) + Maven + Spring Boot 3.3 + MyBatis-Plus 3.5 |
| 后端模块 | common / admin / form / start（单向依赖）|
| ORM | MyBatis-Plus（元数据）+ MyBatis XML（表单数据动态 SQL）|
| 认证 | Spring Security 6 + JWT（access 2h / refresh 7d）+ Redis 黑名单 |
| 数据库 | PostgreSQL 16 + Flyway 10 |
| API 文档 | SpringDoc OpenAPI 3（启动即用 Swagger UI）|
| 容器化 | 多阶段 Azul Zulu，prod（JRE）/ debug（JDK + JDWP 5005）双 target |
| 中间件 | PostgreSQL 16 + Redis 7 |
| 日志 | Logback + 文件滚动（30 天 × 100MB）|
| 前端栈 | Vite + React 18 + TS strict + Ant Design 5 + pnpm 9 |
| 前端 monorepo | apps/platform-admin + packages/form-embeddable + packages/shared-types |
| 前端数据层 | TanStack Query v5（server state）+ Zustand 4（client state）+ axios |
| 国际化 | 不做 |
| Mock | 不做 |
| 自动化测试 | 不做 |
| 链路追踪 | 不做 |

---

## 7. 子项目路线图（参考）

本设计只覆盖**子项目 1（基础设施层）**。后续子项目：

- **子项目 2：表单 Schema 与后端引擎**
  - 表单 schema 数据结构定义
  - 字段映射引擎（关系表 / JSONB 双模）
  - 校验规则引擎
  - 嵌套表单（一对一 / 一对多）数据保存与查询

- **子项目 3：表单设计器前端**
  - 拖拽式 schema 编辑器（左侧字段库 + 中间画布 + 右侧属性面板）
  - 嵌套结构编辑（子表单 / 表格型子表单）
  - 校验规则配置 UI

- **子项目 4：嵌入组件库**
  - `FormFiller`（填写组件）
  - `FormViewer`（展示组件）
  - `FormList`（列表查询组件）
  - 独立 npm 包，可被外部应用嵌入

每个子项目都将通过**完整的 brainstorm → spec → plan → implement** 流程单独启动。

---

## 8. 开放问题

以下问题在基础设施层实现过程中可以**先按设计执行，遇到障碍再回头调整**：

1. 是否需要在 `safe-validator-form` 模块内部进一步拆 `core` / `runtime`（目前只用 package 区分）？→ 子项目 2 启动时决定
2. `packages/shared-types` 是否要接入 OpenAPI 自动生成（取代手维护）？→ 第一个表单 API 完成后决定
3. 种子数据（admin 用户、基础角色）是否纳入基础设施层？→ 本设计已纳入，但具体角色权限矩阵留到 admin 子任务时细化
