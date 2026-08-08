# AGENTS.md

## Purpose

This is the short operating guide for AI-assisted work on IPAC.

IPAC is a live operations platform. Treat the codebase and Supabase project as production-adjacent. Prefer inspection, small changes, and verification over broad rewrites.

## Verified Snapshot

Verified on 2026-08-08 from the current workspace and Supabase MCP:

- Admin app: `admin-panel/`
- Mobile / onsite app: `ipac_mobile/`
- Supabase project: `ipac-operations-app`
- Project ref: `fqynbudvpvpiljdrrvem`
- Region: `ap-south-1`
- Database: Postgres 17
- Public tables: 67, all with RLS enabled and at least one policy
- Public views: `packer_availability_status`, `task_status_view`, `user_effective_permissions`
- Public storage buckets: `media`, `signatures`
- Active Edge Function: `create-user`

Never put credentials, anon keys, service-role keys, or private user data into docs.

## Source Of Truth

When facts conflict, use this order:

1. Current source code in `admin-panel/` and `ipac_mobile/`
2. Live Supabase schema, policies, functions, triggers, storage, and Edge Functions
3. Generated database types and package/config files
4. Maintained docs: `AGENTS.md` and `docs/`
5. README files
6. Historical AI notes, Trail files, old PDFs, one-off diagnostics, `CLAUDE.md`, and `WARP.md`

These docs are compact workflow guidance. They do not replace code/database verification.

## Documentation Map

Before non-trivial work, read the relevant documentation:

- `docs/ARCHITECTURE.md` - system shape, apps, backend, core domains
- `docs/DEVELOPMENT.md` - setup, commands, development workflow
- `docs/ROLES.md` - roles, access, RLS and authorization caveats
- `docs/WORKFLOWS.md` - order-to-report operational workflows

Do not read every document blindly for every task.
Read the files relevant to the area being changed.

When verified behavior changes, update the relevant document.

## System Shape

```text
Admin Web App
      |
      v
   Supabase
      ^
      |
Mobile / Operations App
```

Both apps share one Supabase backend. Any change to auth, roles, RLS, RPCs, triggers, orders, packages, materials, attendance, tasks, media, reports, or client data can affect both apps.

## Current Stacks

Admin uses TypeScript, React, TanStack Start/Router/Query, Vite, Nitro preset `vercel`, Supabase JS, Tailwind/DaisyUI, Zod, Vitest, and Biome.

Mobile uses React Native, Expo/Expo Router, Supabase JS, React Context, AsyncStorage, and NativeWind/Tailwind.

Important admin areas:

```text
src/components/
src/features/
src/hooks/
src/lib/
src/middleware/
src/routes/
server/api/
```

Important mobile areas:

```text
app/
components/
utils/
utils/api/
```

`admin-panel/src/lib/supabase.ts` and `ipac_mobile/utils/api/supabase.ts` are large and central. Do not refactor them casually. Trace callers first.

## Role Caution

Current live `roles.name` rows:

```text
admin
client
executive
packer
sales
```

Current code also references:

```text
director
project_lead
team_lead
customer
```

Do not remove, rename, or merge role references just because one layer looks inconsistent. Verify route guards, mobile layouts, RLS, RPCs, team/order relationships, and temporary privileges first.

## Database Safety

Supabase access is read-only by default.

AI tools, MCP connectors, scripts, SQL tools, and agents may inspect schema and query data needed to understand the system. They must not mutate the database without explicit user approval.

Never do these without explicit approval:

- insert, update, delete, truncate, or mass-update records
- create random test records in shared/live data
- drop or alter tables, columns, schemas, views, policies, functions, triggers, grants, or RLS
- delete or create auth users
- reset databases
- run destructive or mutating RPCs
- deploy Edge Function changes
- upload/delete shared storage objects

Do not assume an RPC is safe because it looks like a normal function call. Many RPCs can write multiple tables.

## Database Change Process

If a database change appears necessary:

1. Inspect schema, callers, triggers, functions, policies, grants, storage, and Edge Functions.
2. Check both admin and mobile impact.
3. Explain the proposed change and likely impact.
4. Ask for explicit approval before executing.
5. Prefer preparing SQL/migration text for review first.
6. Verify after the approved change.

## Working Style

Use this loop:

```text
understand
verify
micro-change
validate
document
```

Keep `AGENTS.md` and `docs/` brief. The future in-app documentation site should hold deeper product/process docs; these files should remain accurate blueprints for daily coding work.
