# Development Guide

## Purpose

This is the short development workflow guide for IPAC. The future in-app documentation site should hold deeper product and process docs.

Read with:

```text
AGENTS.md
docs/ARCHITECTURE.md
docs/ROLES.md
docs/WORKFLOWS.md
```

## Repositories

Workspace layout:

```text
admin-panel/
ipac_mobile/
```

The apps share one Supabase backend. For shared behavior, inspect both apps and the live database.

## Work Order

Use this sequence:

1. Locate the route/screen.
2. Locate the component/container.
3. Locate hooks/services/data access.
4. Check Supabase tables, views, RPCs/functions, triggers, RLS, and storage.
5. Check whether the other app uses the same backend objects.
6. Make the smallest practical change.
7. Validate.
8. Review the diff.

## Admin Setup

```bash
cd admin-panel
npm install
npm run dev
```

Dev server:

```text
http://localhost:3000
```

Useful scripts:

```bash
npm run typecheck
npm run build
npm run test
npm run lint
npm run validate
```

`npm run validate` currently runs typecheck and build. `npm run lint` uses Biome and may write formatting fixes, so review the diff after running it.

## Mobile Setup

```bash
cd ipac_mobile
npm install
npm run start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
```

Mobile development may require Expo, Android, or iOS tooling outside the repo.

## Environment Variables

Admin frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ENABLE_TANSTACK_DEVTOOLS=false
```

Mobile public config/env:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Server-only admin workflows:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_INBOUND_WEBHOOK_SECRET=
```

Rules:

- Never commit real credentials.
- Never put service-role or secret keys in frontend/mobile public env vars.
- Treat `VITE_*` and `EXPO_PUBLIC_*` values as browser/mobile-visible.
- Do not paste keys into docs, logs, tickets, or AI prompts.

## Supabase Project

Verified live project:

```text
name: ipac-operations-app
ref: fqynbudvpvpiljdrrvem
region: ap-south-1
database: Postgres 17
```

Safe to document: project ref/URL, schema shape, table/view/function names, aggregate counts, and RLS status.

Do not document private rows, user PII, or secrets.

## Database Safety

Supabase work is read-only by default.

Do not execute these without explicit approval:

```text
INSERT
UPDATE
DELETE
UPSERT
TRUNCATE
ALTER
DROP
CREATE
GRANT
REVOKE
mutating RPC calls
Edge Function deploys
shared storage uploads/deletes
```

If a DB change is needed, inspect schema/callers/triggers/policies first, check both apps, prepare SQL or migration text for review, ask approval, execute only after approval, then verify.

## Common Entry Points

Admin:

```text
src/routes/
src/routeTree.gen.ts
src/hooks/useAuth.ts
src/hooks/usePageAccess.ts
src/lib/access.ts
src/middleware/auth.ts
src/lib/supabase.ts
src/types/supabase.ts
src/features/orders/
src/features/reports/
src/features/requests/
src/features/inventory-communications/
```

Mobile:

```text
app/index.tsx
app/(admin)/
app/(packer)/
app/auth/
utils/AuthContext.tsx
utils/PackerSessionContext.tsx
utils/PackerNavigation.tsx
utils/api/supabase.ts
utils/api/teamLead.ts
utils/api/inventory.ts
components/packer/
components/packing/
components/admin/inventory/
```

## Shared Workflow Checklist

Before changing these, check admin, mobile, and Supabase:

- authentication/sessions
- roles/access
- orders
- package definitions/overviews/instances
- item allocations and packed items
- packer assignment/team lead behavior
- attendance
- tasks
- materials/securing
- reports/signatures/media
- client portal/client-scoped data

## Working Style

This is an inherited live system. Large files, duplicated logic, old comments, historical names, and mixed patterns exist.

Prefer:

```text
small fix
clear understanding
limited diff
validation
```

Do not refactor unrelated areas during a narrow feature or bug fix.

## Git and Review

The workspace may contain multiple git repositories or untracked docs. Run `git status --short` from the app directory you edit.

Before committing meaningful work:

```bash
git status --short
git diff
npm run typecheck
npm run build
```

For logic-heavy changes, also run:

```bash
npm run test
```

Summaries/PRs should include what changed, why, affected screens/workflows, database impact, admin/mobile cross-impact, and validation performed.

## Documentation Rule

Update `docs/` when you verify important behavior future work depends on. Document verified facts, not guesses copied from stale AI notes.
