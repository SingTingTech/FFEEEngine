# safeValidator

> Form engine platform — design → fill → display

## 结构

```
safeValidator/
├── docs/                   设计文档 + 实现计划（历史 meta 仓内容）
├── backend/                Spring Boot 3.3 + Java 17 + Maven
│   ├── safe-validator-common/   通用 Result/ErrorCode/异常
│   ├── safe-validator-admin/    用户/角色/审计 + form engine API
│   ├── safe-validator-form/     form schema/mapping/validation
│   └── safe-validator-start/    启动模块（main class + Flyway + application.yml）
└── frontend/               pnpm workspace
    ├── apps/
    │   └── platform-admin/     后台管理（用户/角色 + 表单设计器 + 嵌入组件 demo）
    └── packages/
        ├── form-embeddable/    FormFiller + FormList（嵌入组件）
        └── shared-types/        跨包共享类型
```

## 4 个子项目

| # | 子项目 | 文档 |
|---|---|---|
| 1 | 基础设施层 | `docs/superpowers/specs/2026-06-25-infrastructure-layer-design.md` |
| 2 | 后端引擎 | `docs/superpowers/specs/2026-06-26-form-schema-backend-design.md` |
| 3 | 设计器 UI | `docs/superpowers/specs/2026-06-26-form-designer-design.md` |
| 4 | 嵌入组件 | `docs/superpowers/specs/2026-06-26-embeddable-components-design.md` |

## 快速启动

### 后端

```bash
cd backend
DB_PASSWORD=postgres JWT_SECRET=this-is-a-test-secret-for-development-only-32bytes \
mvn -pl safe-validator-start -am spring-boot:run
```

### 前端

```bash
cd frontend
pnpm install
pnpm dev
```

### 全栈（Docker）

```bash
cp backend/.env.example backend/.env
export JWT_SECRET=$(openssl rand -base64 48)
docker compose up -d --build
```

## 端到端流程

1. 登录 `http://localhost:5173`（admin / admin123）
2. 进入 "📋 表单设计器"，创建新表单，配置字段和映射
3. 保存草稿 → 发布新版本
4. 进入 "嵌入组件 Demo" 测试 FormFiller / FormList

## 技术栈

- **后端**：Java 17 (Azul Zulu) + Spring Boot 3.3 + MyBatis-Plus 3.5 + Spring Security 6 + JJWT + Flyway + SpringDoc OpenAPI + PostgreSQL 16 + Redis 7
- **前端**：React 18 + TypeScript 5.5 + AntD 5 + TanStack Query v5 + Zustand 4 + dnd-kit + Vite 5

## License

Internal / proprietary.
