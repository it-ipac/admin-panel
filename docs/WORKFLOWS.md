# Workflows

## Purpose

This is the compact operational workflow map for IPAC: order → allocation → package → packer/team → session → attendance → packing/tasks → reporting.

Verified on 2026-08-08 from current admin code, mobile code, and the live Supabase project shape already recorded in `AGENTS.md`.

Use this as a coding blueprint. The future in-app documentation site should hold deeper product/process detail.

## Source Order

When behavior is unclear, verify in this order:

1. Current admin and mobile code.
2. Live Supabase schema, RLS, functions/RPCs, triggers, storage, and Edge Functions.
3. Generated types and route files.
4. These brief docs.

Do not change workflow behavior based only on this document.

## Main Flow

```text
Order
  -> item allocation
  -> package definition
  -> package overview / physical instances
  -> packer/team selection
  -> packer session
  -> attendance
  -> packing, tasks, materials, media
  -> report / client portal output
```

Admin web owns most order, package, reporting, client, request, user, and settings workflows. Mobile owns onsite execution, especially packer sessions, attendance, package execution, task logs, securing, and package details. Supabase is the shared truth through tables, RLS, RPCs/functions, triggers, and storage.

## 1. Order Setup

Primary table: `orders`

Important fields:

```text
client_id
order_name
reference
description
production_status
commercial_status
project_type
project_lead_id
start_date
completion_date
```

Current `project_type` values:

```text
standard
maintenance
survey
```

Common entry points:

```text
admin-panel/src/routes/orders.tsx
admin-panel/src/routes/orders/index.tsx
admin-panel/src/routes/orders/$orderId.tsx
admin-panel/src/features/orders/
ipac_mobile/app/(admin)/orders.tsx
ipac_mobile/app/(admin)/orders/[orderId].tsx
ipac_mobile/components/admin/AddOrderModal.tsx
```

Workflow notes:

- Orders parent packages, allocations, team membership, attendance, tasks, reports, and client portal output.
- Mobile currently loads `pending` and `in_progress` orders for packer selection.
- `commercial_status` is separate from `production_status`.
- `project_lead_id` is not the same as `order_team_members.is_team_lead`.

Before changing order behavior, check related package, team, attendance, task, report, RLS, trigger, and function behavior.

## 2. Item Allocation

Important tables:

```text
items_db
order_item_allocation
destinations
allocation_increase_requests
```

Common code:

```text
admin-panel/src/features/orders/api/itemsApi.ts
admin-panel/src/features/orders/hooks/useOrderItemMutations.ts
admin-panel/src/features/requests/
ipac_mobile/utils/api/inventory.ts
ipac_mobile/utils/api/supabase.ts
```

Workflow notes:

- `items_db` is client inventory.
- `order_item_allocation` connects inventory items to an order/destination.
- Allocation increase requests are an approval path, not just a form.
- Packed quantities can be affected by `pkd_item`, instance edits/deletes, and database-side behavior.
- Do not assume allocated quantity, packed quantity, and report quantity are identical.

## 3. Package Definition

Keep these layers separate:

```text
order_packages   package definition/template for an order
package_info     dimensions, weights, packing type, SEI/protection data
package_items    custom/manual package item rows
```

Common code:

```text
admin-panel/src/features/orders/hooks/usePackageMutations.ts
admin-panel/src/features/orders/hooks/useOrderItemMutations.ts
admin-panel/src/features/orders/api/orderApi.ts
ipac_mobile/components/admin/orders/
ipac_mobile/components/packing/
ipac_mobile/utils/api/supabase.ts
```

Workflow notes:

- `order_packages.original_pkg_info` and `order_packages.final_pkg_info` are separate package-info references.
- Packing type, gas/vacuum behavior, dimensions, weights, securing, and accessories can depend on package-info data.
- A package definition is not necessarily one physical box.

## 4. Physical Package Instances

Important tables:

```text
order_pkg_overview
order_pkg_instance
pkd_item
media
qr_codes
instance_c_report_map
```

Meaning:

- `order_pkg_overview` groups quantity/progress.
- `order_pkg_instance` is one physical package/box.
- `pkd_item` is an actual packed inventory item inside an instance.
- `media` stores package/item evidence.
- `qr_codes` can point to package instances or packed items.
- `instance_c_report_map` links instances into report output.

Common code:

```text
admin-panel/src/features/orders/api/itemsApi.ts
admin-panel/src/features/orders/hooks/useInstanceMutations.ts
admin-panel/src/features/orders/hooks/useInstanceQr.ts
admin-panel/src/features/orders/hooks/useMovePackage.ts
admin-panel/src/features/reports/components/PackingListPage.tsx
admin-panel/src/routes/portal/scan/$token.tsx
ipac_mobile/app/(packer)/packing-report.tsx
ipac_mobile/components/packing/
```

Workflow caution:

- Reports, QR scans, progress, and inventory counters depend on overview vs instance vs packed-item distinctions.
- Package delete/move behavior is high risk; inspect cascade utilities before touching it.

## 5. Packer / Team Selection

Important objects:

```text
profiles
roles
orders.project_lead_id
order_team_members
packer_availability_status
packer_sessions
```

Relevant RPCs/functions:

```text
get_available_packers
get_all_packers_with_status
assign_packers_to_order
get_order_packers
add_team_lead
assign_team_lead
remove_team_lead
is_team_lead_for_order
update_project_lead_with_status
```

Common code:

```text
ipac_mobile/utils/PackerSessionContext.tsx
ipac_mobile/utils/api/supabase.ts
ipac_mobile/utils/api/teamLead.ts
admin-panel/src/features/orders/api/activityApi.ts
admin-panel/src/lib/supabase.ts
```

Workflow notes:

- Project lead is stored on `orders.project_lead_id`.
- Team lead is order-specific through `order_team_members.is_team_lead`.
- Packer availability can depend on profile status, current order, active session, team membership, and computed availability views/functions.
- Do not merge project-lead and team-lead concepts without a product decision.

## 6. Packer Session

Primary table: `packer_sessions`

Session flags:

```text
team_selected
attendance_completed
packaging_started
session_active
```

Mobile owner:

```text
ipac_mobile/utils/PackerSessionContext.tsx
ipac_mobile/components/NavigationButtons.tsx
ipac_mobile/utils/PackerNavigation.tsx
```

Workflow notes:

- Only `packer` users load packer sessions in mobile context.
- Active sessions are loaded by `packer_id` and `session_active = true`.
- Team sessions can also be discovered by `order_id`.
- `canAccessAttendance()` currently requires `team_selected`.
- `canAccessPackaging()` currently requires `team_selected`; comments indicate attendance gating has changed over time, so verify desired behavior before changing it.

## 7. Attendance

Primary table: `attendance_logs`

Important fields:

```text
order_id
packer_id
log_date
shift_period
status
start_time
end_time
toolbox_briefing_completed
is_project_start
```

Common code:

```text
ipac_mobile/app/(packer)/attendance.tsx
ipac_mobile/utils/api/supabase.ts
admin-panel/src/features/orders/api/activityApi.ts
admin-panel/src/features/orders/utils/excel/manpowerSheets.ts
```

Workflow notes:

- Mobile writes attendance rows and updates end times/restarts.
- Admin reads attendance for order activity and Excel manpower reporting.
- Toolbox briefing can be marked for an order/shift.
- Mobile attendance is usually scoped to today's date.

Before changing attendance logic, check sessions, active attendance lookup, shift behavior, and reports.

## 8. Packing Execution

Important tables:

```text
order_pkg_instance
pkd_item
package_items
items_db
media
order_package_materials
order_package_securing
```

Main code:

```text
ipac_mobile/app/(packer)/packing-report.tsx
ipac_mobile/components/packing/
admin-panel/src/features/orders/hooks/useOrderItemMutations.ts
admin-panel/src/features/orders/hooks/useInstanceMutations.ts
admin-panel/src/features/reports/components/PackingListPage.tsx
```

Workflow notes:

- `package_items` are planned/manual package contents.
- `pkd_item` rows are actually packed inventory items.
- `media` can attach evidence/photos to packages or packed items.
- `order_package_materials` and `order_package_securing` capture material consumption and securing details.
- Reporting can mutate instance status and packed-item details, so reporting is not purely read-only.

## 9. Task Tracking

Important tables/views:

```text
tasks
task_logs
task_assignments
task_packages
task_status_view
maintenance_task_log
maintenance_task_assignments
```

Common code:

```text
ipac_mobile/components/packing/order_tasks_management.tsx
ipac_mobile/utils/api/supabase.ts
admin-panel/src/features/orders/api/activityApi.ts
```

Workflow notes:

- `task_logs` hold time/work records.
- `task_packages` links a task log to one or more order packages.
- `task_assignments` links packers and assignment status to tasks.
- Some task updates are client-computed in mobile code rather than RPC-only.
- Maintenance task tables are separate; do not assume they behave like standard task tables.

## 10. Reporting and Client Output

Important tables/storage:

```text
client_report
client_report_order
client_report_package
instance_c_report_map
order_pkg_instance
pkd_item
media
signatures
company_settings
```

Common code:

```text
admin-panel/src/routes/reports.tsx
admin-panel/src/features/reports/components/ReportBuilder.tsx
admin-panel/src/features/reports/components/PackingListPage.tsx
admin-panel/src/features/reports/components/HeaderDataPanel.tsx
admin-panel/src/routes/my-orders/
admin-panel/src/routes/portal/
```

Workflow notes:

- Reporting combines orders, instances, packed items, media, signatures, and company/header settings.
- Some report screens mutate package instance status, overview progress, report mappings, and packed-item rows.
- Client-facing routes and portal routes must stay scoped by client/order/package access.
- QR scan handling supports newer instance/packed-item tokens and legacy package-token fallback.

## 11. Requests and Communications

Important areas:

```text
material_requests
material_variant_requests
supplier_pricing_requests
allocation_increase_requests
admin-panel/src/features/requests/
admin-panel/src/features/inventory-communications/
server/api/webhooks/resend/inbound.post.ts
```

Workflow notes:

- Request workflows can originate from inventory, material, package, or allocation context.
- Some communication flows use server-only Supabase service-role access and inbound email/webhook handling.
- Keep service-role logic server-only.

## Cross-Workflow Guardrails

For any workflow change, verify:

- admin route/screen behavior
- mobile route/screen behavior
- shared Supabase objects
- role and client scope
- reporting and portal output
- whether the operation is read-only or mutating

High-risk changes:

- role or RLS edits
- order/package delete or move behavior
- packed quantity calculations
- instance status/progress changes
- attendance/session gating
- report visibility/client portal scope
- service-role or Edge Function changes
- storage bucket changes

If behavior must change, make a small implementation change and update this doc only with durable workflow truth.
