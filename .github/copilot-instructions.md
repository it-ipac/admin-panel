# Enterprise Architecture & Engineering Standards
Project: TanStack Start + TypeScript Admin Panel

This project must follow strict enterprise-grade architecture standards.
All generated code must prioritize scalability, maintainability, security, and type safety.

Failure to follow these rules is considered architectural debt.

---

# 1. Core Engineering Principles

- Strict TypeScript mode enabled at all times.
- No `any` type under any circumstances.
- Explicit return types on all exported functions.
- Separation of concerns is mandatory.
- Favor composition over inheritance.
- Favor explicitness over magic.
- Code must be production-ready, not prototype-level.

---

# 2. File Size & Structure Rules

- Hard limit: 400 lines per file.
- Soft limit: 300 lines per file.
- If a file exceeds 300 lines, refactor immediately.
- Components exceeding 200 lines must be split.
- No monolithic modules.

Feature-based folder structure is mandatory:

/features/{feature-name}
  /components
  /hooks
  /services
  /types
  /schemas
  /utils

Never organize by file type globally.

---

# 3. Architecture Boundaries

UI Layer:
- Purely presentational.
- No business logic.
- No direct API calls.

Container Layer:
- Handles orchestration and hooks.
- Connects UI to services.

Service Layer:
- All API communication lives here.
- No UI imports allowed.
- Responsible for request formatting and response normalization.

Schema Layer:
- All input/output validation must use schema validation (e.g. Zod).
- Never trust external data.

No cross-layer violations allowed.

---

# 4. TanStack Usage Standards

TanStack Router:
- Use route-level code splitting.
- Do not embed business logic in route files.

TanStack Query:
- All server state handled via Query.
- No manual fetch logic inside components.
- Query keys must be centralized and typed.
- Use proper staleTime and caching strategy.

Avoid duplicating server state into local state.

---

# 5. Type Safety Requirements

- All API responses must have defined response types.
- All request payloads must have defined request types.
- Use discriminated unions for status handling.
- No implicit type inference for critical logic.
- Shared types must live in a central types module.

Backend and frontend contracts must remain synchronized.

---

# 6. State Management Rules

- Server state → TanStack Query only.
- Local UI state → useState/useReducer only when necessary.
- No global state unless justified.
- Avoid prop drilling by extracting feature boundaries properly.

---

# 7. Forms & Validation

- Centralized validation schemas.
- Client-side validation + server-side validation required.
- No inline validation logic.
- Form logic must be abstracted into hooks.

---

# 8. Security Standards (Admin Panel Critical)

- Assume all inputs are malicious.
- Sanitize and validate all data.
- Never expose internal identifiers unnecessarily.
- Role-based access control structure must be modular.
- No secrets in client code.
- All sensitive operations must be permission-checked.

---

# 9. Error Handling Standards

- All async operations must handle:
  - loading
  - success
  - error

- No unhandled promises.
- Error boundaries required for major route segments.
- Errors must be normalized in service layer.

---

# 10. Performance Standards

- Prevent unnecessary re-renders.
- Memoize only when justified.
- Lazy-load heavy routes.
- Avoid expensive computations in render.

---

# 11. Code Quality Rules

- No magic numbers.
- Extract constants.
- Avoid nested conditionals > 3 levels.
- Refactor complex logic into pure utility functions.
- All complex logic must be unit-testable.
- Functions should do one thing only.

---

# 12. Naming Conventions

- Boolean variables must start with: is, has, should, can.
- Functions must be verbs.
- Components must be PascalCase.
- Hooks must start with `use`.
- No ambiguous names like data, item, temp.

---

# 13. Enterprise Maintainability Rule

If there are multiple possible implementations, always choose:

1. The most type-safe
2. The most modular
3. The most scalable
4. The most testable
5. The least coupled

Short-term speed must never compromise long-term architecture.

---

# 14. Commit Message + Worklog Protocol

Use this protocol for every implementation task:

## Commit message standard (Conventional Commits)

- Always generate commit messages in this format:
  - `<type>(<scope>): <summary>`
- Allowed `type` values:
  - `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`, `revert`
- `scope` should be feature-oriented (examples: `inventory`, `settings`, `requests`, `auth`, `infra`).
- Keep summary <= 72 characters and imperative (example: `add supplier email grouping`).
- Add a commit body when useful:
  - What changed
  - Why it changed
  - Any migration or env impact
- Release type hinting:
  - `feat` => minor
  - `fix` => patch
  - breaking change (`!` or `BREAKING CHANGE:`) => major

## Required engineering worklog in `.docs`

- Maintain a single source-of-truth file at:
  - `.docs/engineering-worklog.md`
- Every completed task must be appended as a new entry with:
  - `id`
  - `date`
  - `status` (`pending_commit`, `committed`, `pushed`)
  - `summary`
  - `files`
  - `release_type` (`major|minor|patch`)
  - `notes` (optional: migrations/env/tests)

## Commit preparation flow

When preparing a commit:

1. Read all `pending_commit` entries from `.docs/engineering-worklog.md`.
2. Generate one consolidated conventional commit message from those entries.
3. After commit succeeds, update those entries to `committed` and add commit SHA.
4. After push succeeds, update those same entries to `pushed`.
5. Never include already `pushed` entries in future commit summaries.

## Safety rules

- Never fabricate completion status.
- Never mark an entry `committed`/`pushed` unless the git operation actually succeeded.
- If commit/push is not requested or not possible, keep status as `pending_commit`.
