# IPAC Architecture

## Purpose

This is the compact architecture blueprint for IPAC. It captures verified system shape and the main domains without becoming the future full documentation site.

Verified on 2026-08-08 from current code, package/config files, generated route/types files, and Supabase MCP.

## System Overview

```text
Admin Web Application
        |
        v
     Supabase
        ^
        |
Mobile / Operations Application
```

The admin and mobile apps share one Supabase backend. Backend changes can affect both applications even when the change is made for one screen.

## Applications

Admin app:

- location: `admin-panel/`
- purpose: main desktop interface for internal operations and restricted client views
- stack: React 19, TypeScript, TanStack Start/Router/Query, Vite 7, Nitro `vercel`, Supabase JS, Tailwind/DaisyUI, Radix UI, Zod, Vitest, Biome
- route access: `src/lib/access.ts` and `src/hooks/usePageAccess.ts`
- auth: `src/hooks/useAuth.ts`, `src/middleware/auth.ts`
- central Supabase access: `src/lib/supabase.ts`
- server workflows: `server/api/`

Mobile app:

- location: `ipac_mobile/`
- purpose: onsite operations, especially packer workflows
- stack: React Native, Expo 54, Expo Router, Supabase JS, React Context, AsyncStorage, NativeWind/Tailwind
- route entry: `app/index.tsx`
- auth/session: `utils/AuthContext.tsx`, `utils/PackerSessionContext.tsx`, `utils/api/supabase.ts`
- current root routing sends `admin/director/sales` to mobile admin screens and `packer` to packer screens
- older mobile admin screens still exist; verify current usage before treating them as future architecture

## Supabase Backend

Verified project:

```text
name: ipac-operations-app
ref: fqynbudvpvpiljdrrvem
region: ap-south-1
database: Postgres 17
```

Verified backend shape:

- 67 public tables, all with RLS enabled and at least one policy
- public views: `packer_availability_status`, `task_status_view`, `user_effective_permissions`
- public storage buckets: `media`, `signatures`
- active Edge Function: `create-user`
- many public functions/RPCs, including both invoker and security-definer functions
- trigger-driven behavior in orders, package instances, packed items, team membership, profiles, reports, settings, and maintenance tasks

Supabase provides auth, database, RLS, RPCs/functions, triggers, storage, and Edge Functions. The backend contains business logic, not just CRUD.

## Core Domain

Central entity:

```text
orders
```

Simplified model:

```text
Client
  -> Order
     -> Item Allocations
     -> Package Definitions
     -> Package Overviews
     -> Physical Package Instances
     -> Packed Items
     -> Team / Packers
     -> Attendance
     -> Tasks
     -> Reports
```

Connected domains:

```text
Materials
Suppliers
Securing
Requests / Approvals
Audit
Client Portal
Maintenance
Users / Roles / Permissions
Media and Signatures
```

## Orders

Primary table:

```text
orders
```

Important concepts:

- client relationship: `client_id`
- customer reference: `reference`
- lifecycle: `production_status`, `commercial_status`
- project kind: `project_type` enum values `standard`, `maintenance`, `survey`
- leadership: `project_lead_id`

Many domain records eventually connect back to an order.

## Items and Allocations

Important tables:

```text
items_db
order_item_allocation
destinations
allocation_increase_requests
```

`order_item_allocation` connects order, item, and destination. Packed quantities may be recalculated through database functions/triggers, so quantity behavior is not purely frontend-owned.

## Package Model

Keep these layers distinct:

```text
order_packages      package definition/template
order_pkg_overview  grouped quantity/progress
order_pkg_instance  one physical package/box
pkd_item            item actually packed into an instance
```

Reports, QR flows, packing progress, and allocation reconciliation depend on this distinction.

## Packer and Team Model

Important objects:

```text
profiles
orders
order_team_members
packer_sessions
attendance_logs
task_assignments
packer_availability_status
```

A packer's operational state can depend on role, `profiles.packer_status`, `profiles.current_order_id`, order assignment, `order_team_members.is_team_lead`, active session, attendance, and task state.

Team-lead status is order-specific. It is not the same thing as a global `project_lead` role.

## Tasks

Standard tasks:

```text
tasks
task_logs
task_assignments
task_packages
task_status_view
```

Maintenance tasks:

```text
maintenance_task_log
maintenance_task_assignments
```

Maintenance categories are `survey`, `unpack`, and `repack`. Do not assume standard and maintenance tasks share identical behavior.

## Materials and Securing

Material tables:

```text
materials
material_variants
material_tags
material_variant_tags
suppliers
supplier_pricing
units_of_measure
order_package_materials
```

Securing tables:

```text
beam
securing_template
order_package_securing
```

Securing is modeled separately from normal material rows.

## Requests, Communications, Reports

Request/approval tables:

```text
material_requests
material_variant_requests
supplier_pricing_requests
allocation_increase_requests
request_audit_log
```

Supplier communication code:

```text
server/api/webhooks/resend/inbound.post.ts
src/features/inventory-communications/
```

Reporting tables:

```text
report_batch
report_template_settings
client_report
client_order
client_shipment
client_quality_control
instance_c_report_map
client_report_orders
client_report_collaborators
signatures
```

Reports depend on order/client links, package instance status, packed timestamps, destinations, item counts, media/QR links, settings, and signatures.

## Trigger-Driven Behavior

Live triggers currently exist on:

```text
app_settings
client_report
maintenance_task_assignments
maintenance_task_log
order_pkg_instance
order_pkg_overview
order_team_members
orders
pkd_item
profiles
```

Important trigger effects include packer status synchronization, single active order enforcement, package overview rollups, allocation packed quantity sync, report number assignment, and `updated_at` maintenance.

Always inspect triggers/functions before changing frontend mutations around these tables.

## Auth and Privileged Workflows

Both apps use Supabase Auth.

Admin username login uses `get_user_email_by_username` before password sign-in.

The active Edge Function is `create-user`. It uses a service-role key server-side and is a privileged user-management workflow.

## Principles

1. Verify current code and Supabase before trusting old docs.
2. Treat Supabase as shared infrastructure.
3. Check both apps before changing shared tables, RPCs, RLS, auth, or storage.
4. Keep package definitions, overviews, instances, and packed items distinct.
5. Treat role names as technical details, not business truth.
6. Expect database triggers to change state indirectly.
7. Prefer small, focused changes with validation.
