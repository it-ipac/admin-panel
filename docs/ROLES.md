# Roles and Access

## Purpose

This is the compact role/access blueprint for IPAC. It describes verified behavior; it is not permission to rename or redesign roles.

Verified on 2026-08-08 from admin code, mobile code, and live Supabase `roles`, `profiles`, policies, views, and functions.

## Core Rule

Business job titles and technical role names do not always match.

Effective access can depend on:

```text
profile role
frontend route policy
mobile route/layout guards
RLS policies
database functions/RPCs
temporary privileges
client scope
order assignment
team membership
team-lead status
packer session
attendance/task state
```

Do not infer access from a role name alone.

## Live Roles

Current live `roles.name` values:

```text
admin
client
executive
packer
sales
```

Current live profile assignments use those same five roles.

Current code also references:

```text
director
project_lead
team_lead
customer
```

Treat those as historical or code-path-specific names until intended business behavior is confirmed.

## Role Permission Flags

The `roles` table includes:

```text
can_block_users
can_unblock_users
can_ban_users
can_reset_passwords
can_delete_profiles
can_manage_roles
```

Current live flag highlights:

- `executive` has all listed flags enabled.
- `admin` can block, unblock, and reset passwords, but not ban/delete/manage roles.
- `client` can reset passwords according to the flag, but still depends on frontend/RLS/client scope.
- `packer` and `sales` have the listed flags disabled.

These flags are not the whole permission system.

## Admin Web Access

Current admin-panel page access is defined in:

```text
src/lib/access.ts
src/hooks/usePageAccess.ts
```

Full admin-panel access:

```text
admin
director
executive
sales
```

Full access pages:

```text
/dashboard
/orders
/clients
/users
/inventory
/inventory-duplicates
/requests
/reports
/settings
/data-import
```

Current `src/lib/access.ts` grants `client` no admin-panel pages. Client users use the Package Portal instead.

`packer` and unknown roles currently receive no normal admin-panel pages from `src/lib/access.ts`.

The sidebar, login landing route, and `useRequirePageAccess()` consume this policy.

## Cross-Area Session Handling

The web root uses one shared account-area guard for authenticated users so the Admin Panel and Package Portal behave symmetrically.

When a `client` account opens a non-portal route, the user sees a **Client Account Detected** screen with:

- **Go to Package Portal** — keeps the current session and opens `/portal/projects`.
- **Sign out** — ends the current session and opens `/login`.

When a full admin-panel role (`admin`, `director`, `executive`, or `sales`) opens `/portal` or `/portal/*`, the same shared screen is used as **Staff Account Detected** with:

- **Go to Admin Panel** — keeps the current session and opens `/dashboard`.
- **Sign out** — ends the current session and opens `/portal/login`.

This is a frontend routing guard only. It does not broaden role permissions, change client scoping, or replace RLS/database enforcement.

## Middleware Warning

`src/middleware/auth.ts` contains:

```text
requireAuth()
requireAdmin()
```

`requireAuth()` checks for a Supabase session. `requireAdmin()` currently calls `requireAuth()` and returns the user; its own comment says role checking is a placeholder. Do not rely on it as a complete authorization boundary.

## Mobile Access

Current mobile root routing:

- `admin`, `director`, `sales` route to `/(admin)/home`
- `packer` routes to `/(packer)/dashboard`
- unknown roles route to login

Current mobile admin layout allows:

```text
admin
director
sales
```

Current mobile packer layout allows:

```text
packer
```

`executive` and `client` are live database roles, but they are not explicitly routed as mobile admin/packer roles in current mobile root/layout code.

## Client Access

Client users are scoped differently from internal users.

Client scoping can depend on:

```text
profiles.client_id
current_client_id()
is_my_client_order()
is_my_client_package()
is_my_client_instance()
```

Client-facing routes include:

```text
/portal/login
/portal/projects
/portal/item/$id
/portal/package/$id
/portal/scan/$token
```

Client-access changes are high risk because they can expose another client's data.

## User Creation

The active Supabase Edge Function is:

```text
create-user
```

It uses a service-role key server-side and currently allows callers whose profile role is:

```text
director
admin
```

This does not exactly match the live role flags where `executive` has `can_manage_roles = true`. Treat this as verified role drift, not something to "fix" without approval.

## Project Lead vs Team Lead

Separate concepts:

```text
orders.project_lead_id
order_team_members.is_team_lead
project_lead role references
```

`order_team_members.is_team_lead` is order-specific. It does not mean the user has a global `project_lead` role.

Relevant functions include:

```text
add_team_lead
assign_team_lead
remove_team_lead
get_order_team_leads
is_team_lead_for_order
can_be_project_lead
update_project_lead_with_status
count_order_team_leads
order_has_team_lead
```

## Temporary Privileges

Relevant objects:

```text
temporary_privileges
user_effective_permissions
user_has_permission()
deactivate_expired_privileges()
```

Effective permissions may differ from a user's base role.

## Packer State

Packer state is spread across:

```text
profiles.packer_status
profiles.current_order_id
orders.project_lead_id
order_team_members
packer_sessions
attendance_logs
task_assignments
task_logs
task_packages
packer_availability_status
```

Relevant functions include:

```text
get_available_packers
get_busy_packers
get_all_packers_with_status
get_packer_assignment_status
assign_packers_to_order
admin_force_release_packer
remove_self_from_order
can_user_mark_attendance
can_record_attendance
packer_logged_attendance_today
packer_needs_daily_attendance
```

Do not decide packer authorization solely from the global `packer` role.

## Database Enforcement

Live Supabase currently has:

- RLS enabled on all 67 public tables
- at least one policy on every public table
- security-definer and invoker functions
- views used by access/user/task flows

Security-definer functions can bypass RLS depending on their body and grants. Inspect function definitions and policies before changing access behavior.

## Before Changing Role Logic

Answer these first:

1. What business user/workflow is affected?
2. What technical role does the user currently have?
3. Which admin routes can they access?
4. Which mobile routes can they access?
5. Which RLS policies apply?
6. Which RPCs/functions are involved?
7. Are temporary privileges involved?
8. Is client scoping involved?
9. Is order/team membership involved?
10. Will both apps be affected?

## High-Risk Actions

Do not autonomously rename, merge, delete, or reassign roles; broaden frontend access; weaken RLS; remove ownership/client checks; change security-definer functions; or expose service-role behavior to clients.

Any such change requires explicit approval and impact review.
