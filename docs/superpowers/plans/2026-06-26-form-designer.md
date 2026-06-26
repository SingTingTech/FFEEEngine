# Form Designer UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a drag-and-click form designer UI in `platform-admin` (Vite + React 18 + AntD 5) that lets admin users design form schemas by consuming sub-project 2's HTTP API.

**Architecture:** Pure frontend (no new backend services except for V5 migration + sections APIs in sub-project 2). 3-pane layout (Component Library / Canvas / Property Panel). TanStack Query for server state, Zustand for draft state. dnd-kit for drag-and-drop. React Router for navigation.

**Tech Stack:** React 18, TypeScript 5.5 strict, AntD 5, TanStack Query v5, Zustand 4, @dnd-kit/core + @dnd-kit/sortable, Vite 5.

**Spec:** [docs/superpowers/specs/2026-06-26-form-designer-design.md](../specs/2026-06-26-form-designer-design.md)

**Pre-requisite:** Sub-project 1 (infrastructure) + Sub-project 2 (form engine backend) both complete. `platform-admin` app exists with TanStack Query, Zustand, AntD already configured.

**Two repos in scope:**
- `backend/` — extends sub-project 2 with V5 migration + sections API (Step 0)
- `frontend/apps/platform-admin/` — the new designer code

**Testing:** Per design §13 — unit tests for store and dndHelpers, component tests for key components (ComponentLibrary, Canvas, PropertyPanel, LinkFieldsEditor), integration test with MSW for the full designer flow. E2E Playwright optional.

**No Lombok** (Java side, already established). No strict TDD on every component — focus tests on store and pure helpers, plus integration coverage of the critical paths.

**Conventions:**
- Conventional Commits: `feat(designer): ...`, `feat(form): ...` (backend), `test(designer): ...`, `fix(designer): ...`
- Each commit compiles (`pnpm --filter platform-admin typecheck`)
- All file paths in this plan are relative to `/home/cris/dev/safeValidator/`

---

## Execution Order

| Phase | Scope | Output State |
|---|---|---|
| 0 | Backend extensions (V5 migration + sections APIs) | `form_section` table exists; 4 new APIs work |
| 1 | Frontend infrastructure (deps + types + designerApi + designerStore) | Types defined; API client works; store has actions |
| 2 | Form list page (FormListPage + CreateFormModal) | List/create forms; navigates to designer |
| 3 | Designer shell (DesignerPage + TopBar + ComponentLibrary) | 3-pane layout; click-to-add works |
| 4 | Canvas + dnd-kit (Canvas + CanvasField + CanvasSection + SubformContainer) | Drag-to-insert + reorder works |
| 5 | Property panel + subform config (PropertyPanel + SubformConfigDrawer + LinkFieldsEditor + ValidationEditor) | Type-aware editing works; subform config saves |
| 6 | Preview + tests + E2E | Preview reads current schema; all tests pass |

After all phases: `pnpm dev` → login → click "📋 表单设计器" → create a form → add fields + sections + subform → save draft → publish → all flows work.

---

## Phase Files

- [Part 0: Backend Extensions](2026-06-26-form-designer-part0-backend-ext.md) — V5 migration + sections API + service updates
- [Part 1: Frontend Infrastructure](2026-06-26-form-designer-part1-frontend-infra.md) — deps + types + API client + store
- [Part 2: Form List Page](2026-06-26-form-designer-part2-form-list.md) — list + create modal
- [Part 3: Designer Shell + Component Library](2026-06-26-form-designer-part3-designer-shell.md) — 3-pane layout + left panel
- [Part 4: Canvas + dnd-kit](2026-06-26-form-designer-part4-canvas-dnd.md) — center panel + drag/drop
- [Part 5: Property Panel + Subform Config](2026-06-26-form-designer-part5-property-subform.md) — right panel + drawers
- [Part 6: Preview + Tests](2026-06-26-form-designer-part6-preview-tests.md) — preview drawer + tests

---

## Cross-Phase Notes

1. **Backend first (Phase 0)** — designer consumes the new sections APIs and V5 schema; without Phase 0, the designer breaks.
2. **Each phase commits independently** — even mid-phase, the app should still build and typecheck.
3. **Use `pnpm --filter platform-admin typecheck`** after each frontend commit (NOT `tsc -b` which is too strict for incremental work).
4. **The design doc is the source of truth** for code structure and styling — when this plan says "as in design §6.2", look there for the exact JSX.
5. **Field type icons** — for MVP, use the first letter of the type as the icon (e.g., "文" for text). Polished icons can come later.
