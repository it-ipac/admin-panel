# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # vite dev --port 3000
npm run build
npm run test       # vitest run (single test: npx vitest run path/to/file.test.ts)
npm run lint       # biome check --write ./src
npm run typecheck  # tsc --noEmit
npm run validate   # typecheck + build (run before deploy/PR)
```

Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (optional `VITE_ENABLE_TANSTACK_DEVTOOLS=true`). Deploys to Vercel via GitHub Actions (not Vercel auto-deploy); Nitro preset `vercel`. Build injects `__APP_VERSION__`, `__APP_COMMIT_SHA__`, etc. from vite.config.ts.

## Stack & architecture

Vite + React 19 + TanStack Start/Router/Query, Tailwind CSS 4 + DaisyUI + Radix primitives, Zod validation, Biome for lint/format.

- **Colors**: only the semantic scales defined in `src/styles.css` `@theme` are allowed — `primary`, `neutral`, `steel` (dark surfaces), `danger`, `success`, `warning`, `accent`, `ember`, `iris`, `aqua` (e.g. `bg-primary-600`, `text-neutral-500`). Raw Tailwind palettes (`bg-blue-500`, `text-gray-700`, …) are disabled via `--color-*: initial` and produce **no CSS**. To change the app's colors, edit `src/styles.css` only.

- **Container-Presenter pattern**: route containers (e.g. `src/routes/orders/$orderId.tsx`) own all `useQuery`/`useMutation` hooks; tab components under `src/components/orders/orderId/tabs/` are pure presenters receiving data + mutation callbacks as props.
- **Server state lives in TanStack Query only** — no manual fetch in components, no duplicating server state into local state. Mutations invalidate queries on success.
- Supabase client: `src/lib/supabase.ts` (PKCE flow, custom auth storage key `ipac-admin-auth`, corrupted sessions auto-cleared on module load). Auth via `useAuth()`; usernames map to emails through an RPC.
- Nested Supabase relations are flattened in mappers; deep nesting (securing → beam) uses 2-step batch queries with `.in()` to avoid N+1.
- Validation: Zod schemas in `src/lib/validation.ts`, applied at form level via `validateInput<T>()`.

## Domain model

Backend is the shared IPAC Supabase project (also used by the Expo operations app — schema changes affect both). Role hierarchy: director → admin → project_lead → sales → packer (stored in `profiles`, enforced by RLS).

Core data flow: `orders` → `order_packages` → `order_package_materials` (many:many to `materials`/`material_variants`). Manufacturing/wooden structures live in `order_package_securing` → `securing_template` → `beam` — **not** in the materials tables. Material dropdowns are tag-driven via `material_variant_tags`. Other key tables: `attendance_logs`, `packer_sessions`, `audit_log` (sensitive actions logged, critical ones flagged `is_critical_alert`), `media`, `supplier_pricing`.

## Engineering standards (from `.github/copilot-instructions.md` — follow these)

- Strict TypeScript, no `any`, explicit return types on exported functions.
- File size: soft limit 300 lines, hard limit 400; split components over 200 lines.
- Layer boundaries: UI (presentational only) / container (orchestration) / service (all API calls, no UI imports) / schema (Zod). No cross-layer violations.
- Conventional Commits: `<type>(<scope>): <summary>` ≤72 chars, imperative. `feat`→minor, `fix`→patch, breaking→major.
- **Worklog protocol**: append every completed task to `.docs/engineering-worklog.md` with id/date/status (`pending_commit`→`committed`→`pushed`)/summary/files/release_type. Update status only after the git operation actually succeeds.

Reference docs in `.docs/`: `DATA_FLOW.md`, `DATABASE_SCHEMA.md`, `QUERY_PATTERNS.md`, `COMPONENT_ARCHITECTURE.md`, `INPUT_VALIDATION.md`, `CI_CD_SETUP.md`.
