# Embeddable Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@safe-validator/form-embeddable` — a pnpm workspace package providing 3 embeddable React components (`FormFiller`, `FormList`, plus internal `ReferenceField`/`NestedChildren`) that consume sub-project 2's HTTP API to render and submit form data.

**Architecture:** Pure frontend package. No backend changes. Components handle their own data fetching via TanStack Query against an `apiBase` + `token` consumer prop. FormList CRUD actions emit consumer callbacks (consumer handles routing/DELETE). FormFiller has inline [Cancel] [Save] buttons. 1:N subforms render inline below parent fields. Reference fields are async-searchable Selects showing display text but storing ID.

**Tech Stack:** React 18, TypeScript 5.5 strict, AntD 5 (peer), TanStack Query v5, Vite 5 (build config only, MVP skips bundling).

**Spec:** [docs/superpowers/specs/2026-06-26-embeddable-components-design.md](../specs/2026-06-26-embeddable-components-design.md)

**Pre-requisite:** Sub-projects 1, 2, 3 all complete. `packages/form-embeddable/` directory exists with placeholder `src/index.ts` (from sub-project 1 phase 5). `packages/shared-types` has `Result`, `PageQuery`, `PageResult`, `FormFieldDefVO`, `SchemaDetailVO`, `FormRecord` exported.

**No new backend changes required.**

**Testing:** Per design §12 — unit tests for hooks (useFormSchema, useFormData, useFormList, useReferenceLookup), component tests for FieldRenderer/ReferenceField/FormList/FormFiller (rendering + interactions), integration test with MSW for full FormFiller submit flow.

**Conventions:**
- Conventional Commits: `feat(emb): ...`, `test(emb): ...`, `fix(emb): ...`
- Each commit typechecks (`pnpm --filter form-embeddable typecheck`)
- All file paths relative to `/home/cris/dev/safeValidator/`
- TS strict + `noUnusedLocals` (matching sub-project 3)

---

## Execution Order

| Phase | Scope | Output State |
|---|---|---|
| 1 | Foundation: package config + types + API + 4 hooks | Hooks work standalone, types compiled |
| 2 | FieldRenderer + ReferenceField | Atomic field components renderable |
| 3 | NestedChildren + FormFiller | Main filling component working end-to-end |
| 4 | FormList | List + CRUD + callbacks |
| 5 | Tests + integration + README | All tests pass; demo in platform-admin |

After all phases: a consumer app can `import { FormFiller, FormList } from '@safe-validator/form-embeddable'` and use them.

---

## Phase Files

- [Part 1: Foundation (package + types + api + hooks)](2026-06-26-embeddable-components-part1-foundation.md)
- [Part 2: FieldRenderer + ReferenceField](2026-06-26-embeddable-components-part2-field-components.md)
- [Part 3: NestedChildren + FormFiller](2026-06-26-embeddable-components-part3-formfiller.md)
- [Part 4: FormList](2026-06-26-embeddable-components-part4-formlist.md)
- [Part 5: Tests + Integration + README](2026-06-26-embeddable-components-part5-tests.md)

---

## Cross-Phase Notes

1. **Build artifacts deferred** — MVP doesn't bundle (entry points to `src/index.ts`, pnpm workspace consumes source directly). `vite.config.ts` is provided for future bundling but not invoked.
2. **The existing `src/index.ts` placeholder** from sub-project 1 must be REPLACED (not appended to). The existing file exports placeholder types only.
3. **All hooks go in `src/hooks/`** — they are internal, NOT exported from `index.ts`.
4. **MSW is used for integration tests** — set up in `src/__tests__/mocks/`.

