# Infrastructure Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Spring Boot 3.3 + React 18 monorepo skeleton with JWT auth, MyBatis-Plus persistence, PostgreSQL/Redis, and Docker Compose orchestration. Output: `docker compose up` brings up a fully functional admin app where you can log in as `admin/admin123`, manage users and roles.

**Architecture:** Two independent git repositories (`backend/` Maven multi-module, `frontend/` pnpm monorepo) plus a meta repo at the workspace root tracking design docs. Backend uses Azul Zulu JDK 17 + Spring Boot 3.3 with strict module dependency direction (start → admin/form → common). Frontend uses Vite + React 18 + TS strict + Ant Design 5 + TanStack Query (server state) + Zustand (client state). All services containerized via Docker Compose.

**Tech Stack:** Java 17 (Azul Zulu), Maven 3.9, Spring Boot 3.3, Spring Security 6, MyBatis-Plus 3.5, JJWT 0.12, Flyway 10, SpringDoc OpenAPI 2.6, PostgreSQL 16, Redis 7, pnpm 9, Vite 5, React 18, TypeScript 5.5, Ant Design 5, TanStack Query v5, Zustand 4, axios 1.

**Spec:** [docs/superpowers/specs/2026-06-25-infrastructure-layer-design.md](../specs/2026-06-25-infrastructure-layer-design.md)

**Sub-plans:** This plan is decomposed into focused sub-plan files for maintainability:
- [Part 1: Repository & Maven Skeleton](./2026-06-25-infrastructure-layer-part1-repo-maven.md)
- [Part 2: Common Module & Database](./2026-06-25-infrastructure-layer-part2-common-database.md)
- [Part 3: Security & Admin APIs](./2026-06-25-infrastructure-layer-part3-security-admin.md)
- [Part 4: Form Placeholder & Start Module](./2026-06-25-infrastructure-layer-part4-form-start.md)
- [Part 5: Frontend Monorepo](./2026-06-25-infrastructure-layer-part5-frontend-monorepo.md)
- [Part 6: Frontend Pages & State](./2026-06-25-infrastructure-layer-part6-frontend-pages.md)
- [Part 7: Containerization & Verification](./2026-06-25-infrastructure-layer-part7-containerization.md)

**Testing Note:** Per user direction, this infrastructure layer ships **zero automated tests**. Test code is added per-sub-project as needed. Each task ends with a manual verification step (build, run, smoke check) instead.

**Conventions:**
- All commits follow Conventional Commits (`feat:`, `chore:`, `docs:`, `fix:`)
- Backend Java packages under `com.safevalidator.{common,admin,form,start}`
- Frontend TS follows feature-based directory layout (see design §4.3)
- All env-specific values go through env vars (never hardcoded)
- Each phase ends with a "Phase Complete" verification checkpoint

---

## Execution Order

Execute phases sequentially in numerical order. Each phase produces a runnable checkpoint.

| Phase | Scope | Output State |
|---|---|---|
| 1 | Repo + Maven skeleton | `mvn -pl safe-validator-start compile` succeeds |
| 2 | Common module + database | Flyway migrations apply, metadata tables exist |
| 3 | Security + admin APIs | `POST /auth/login` returns JWT; user CRUD works via curl |
| 4 | Form placeholder + start module | App starts, logs "Started SafeValidatorApplication" |
| 5 | Frontend monorepo | `pnpm dev` serves `http://localhost:5173` |
| 6 | Frontend pages | Login page renders; can navigate to /users |
| 7 | Containerization | `docker compose up -d` runs full stack |

After all phases: open `http://localhost:5173`, log in as `admin/admin123`, verify dashboard + user management + role management all work.

---

## Phase Summary (cross-reference)

| Phase | Tasks | Sub-plan |
|---|---|---|
| Phase 1 | Tasks 1.1 – 1.6 | [Part 1](./2026-06-25-infrastructure-layer-part1-repo-maven.md) |
| Phase 2 | Tasks 2.1 – 2.9 | [Part 2](./2026-06-25-infrastructure-layer-part2-common-database.md) |
| Phase 3 | Tasks 3.1 – 3.16 | [Part 3](./2026-06-25-infrastructure-layer-part3-security-admin.md) |
| Phase 4 | Tasks 4.1 – 4.5 | [Part 4](./2026-06-25-infrastructure-layer-part4-form-start.md) |
| Phase 5 | Tasks 5.1 – 5.10 | [Part 5](./2026-06-25-infrastructure-layer-part5-frontend-monorepo.md) |
| Phase 6 | Tasks 6.1 – 6.7 | [Part 6](./2026-06-25-infrastructure-layer-part6-frontend-pages.md) |
| Phase 7 | Tasks 7.1 – 7.6 | [Part 7](./2026-06-25-infrastructure-layer-part7-containerization.md) |
