# Form Schema + Backend Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the form engine backend: schema management (form_schema/field_def/relationship/business_key), field type + validation + type-converter registries with 10/9/9 built-ins, mapping engine for hybrid storage (user-mapped tables + engine form_data JSONB), parent-child submission with cascade delete, reference field lookup, and all admin/runtime APIs.

**Architecture:** Backend in `safe-validator-form` module. Two storage layers: MyBatis-Plus for metadata tables, JdbcTemplate for dynamic SQL into user-mapped tables. Pluggable registries via `@Component` scanning (no Spring config). Parent-child submission is a single transactional request. Schema versioning is immutable history + schema-on-read for form_data.

**Tech Stack:** Java 17 (Azul Zulu), Spring Boot 3.3, MyBatis-Plus 3.5.9, JdbcTemplate (dynamic SQL), JJWT (existing), Jackson, JUnit 5, Mockito, Testcontainers, Spring Boot Test.

**Spec:** [docs/superpowers/specs/2026-06-26-form-schema-backend-design.md](../specs/2026-06-26-form-schema-backend-design.md)

**Pre-requisite:** Sub-project 1 (infrastructure layer) complete. `safe-validator-form` module exists with `schema/runtime/mapping/validation` package-info.java placeholders. `errorcode/exception/Result/PageQuery/PageResult/BaseEntity/MybatisAutoFillHandler/SecurityUtils` all available in `safe-validator-common`.

**Testing:** Per design §15 — every Engine/Registry must have unit tests, every Service has integration tests with Testcontainers (Postgres 16-alpine), every Controller has `@SpringBootTest` MockMvc tests.

**No Lombok:** Continue the convention from sub-project 1 — explicit getters/setters and constructors. JDK 26 + Lombok 1.18.34 remain incompatible.

---

## Execution Order

| Phase | Scope | Output State |
|---|---|---|
| 1 | DB migrations (V3, V4) + DTOs + ErrorCodes | Flyway applies; new tables exist; base DTOs in place |
| 2 | Mapping package — registries + 10 field types | FieldType/TypeConverter registries; 10 FieldType beans; introspection works |
| 3 | Mapping package — 9 type converters + ColumnIntrospector | All conversions work; introspector lists user tables/columns |
| 4 | Validation package — registry + engine + 9 rules | All validation rules; engine aggregates errors |
| 5 | Schema entities, mappers, services | Schema CRUD works; version publishing works |
| 6 | MappingEngine + ReferenceEngine + FormDataService + CascadeDelete | Full runtime: submit/read/list/cascade delete all work |
| 7 | Controllers + E2E smoke test | All HTTP endpoints work; docker-compose boot succeeds |

After all phases: backend can serve form CRUD APIs, accept parent+children submission, return data with children, lookup references, introspect user tables, and cascade delete parent records.

---

## Phase Files

- [Part 1: Migrations, DTOs, ErrorCodes](2026-06-26-form-schema-backend-part1-migrations-dtos.md)
- [Part 2: Mapping — Registries + 10 Field Types](2026-06-26-form-schema-backend-part2-mapping-types.md)
- [Part 3: Mapping — 9 Converters + Introspector](2026-06-26-form-schema-backend-part3-mapping-converters.md)
- [Part 4: Validation — Engine + 9 Rules](2026-06-26-form-schema-backend-part4-validation.md)
- [Part 5: Schema Entities, Mappers, Services](2026-06-26-form-schema-backend-part5-schema-services.md)
- [Part 6: Engines + FormDataService + Cascade Delete](2026-06-26-form-schema-backend-part6-runtime.md)
- [Part 7: Controllers + E2E Smoke Test](2026-06-26-form-schema-backend-part7-controllers.md)

---

## Key Conventions (Apply Across All Phases)

1. **No Lombok.** Use explicit getters/setters/constructors.
2. **MyBatis-Plus** for metadata tables (form_schema, form_field_def, etc.). **JdbcTemplate** for dynamic SQL into user-mapped tables.
3. **All SQL parameters in user-mapped tables use `?` placeholders for VALUES** (no injection). Table/column names come from form_field_def (whitelisted) and are string-concatenated.
4. **Commit messages follow Conventional Commits.** `feat(form): ...` for new code, `test(form): ...` for tests, `fix(form): ...` for fixes.
5. **Each commit compiles** (`mvn -pl safe-validator-form -am compile -q`) before moving to the next task.
6. **Tests use JUnit 5 + AssertJ** (already in Spring Boot starter test).
7. **All file paths in this plan are relative to `/home/cris/dev/safeValidator/backend/`.**
