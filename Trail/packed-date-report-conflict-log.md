# Packed Date / Report Conflict Log

Created: 2026-08-08  
Scope: `admin-panel` report conflict around TAQA AIN packing-list dates.

This file records what was changed during the investigation, what the report showed before vs after the changes, and what would be impacted if we revert.

## Revert status

Reverted on: 2026-08-08

The value-affecting changes described below were reverted after this log was created:

- The 19 Excel-backed `order_pkg_instance.packed_at` values were set back to `null`.
- The active `public.fetch_report_instances(...)` RPC was reverted back to old report-date logic using `MAX(pkd_item.created_at)`.
- Local changes in `src/features/reports/components/PackingListPage.tsx` and `src/features/reports/types.ts` were reverted.

Post-revert verification:

- 19/19 Excel-backed rows now have `packed_at = null`.
- The same TAQA AIN report filter now shows `11` boxes again.
- The report function line is back to `max(pi.created_at) AS last_packed_at`.

The tables below remain useful as the audit trail of what changed before the revert.

## Context

The Excel sheet shared in chat was treated as the temporary source of truth for 19 AIN boxes in order:

`2026-0619-V55-TAQA-2-Final Tablet-R1`

Supabase order id verified during investigation:

`3b1d8933-f97f-4dc1-9a32-a0266d756566`

Report filter used for comparison:

- Order: `2026-0619-V55-TAQA-2-Final Tablet-R1`
- Destination: `AIN`
- Date mode: `item_packed_at`
- Date range: `2026-07-21 00:00:00+00` through `2026-08-06 23:59:59+00`
- `has_items_only = true`

## Changes made

### 1. Supabase data backfill

Updated only `order_pkg_instance.packed_at` for the 19 Excel-backed boxes.

Before the update, these 19 target rows were checked and had:

```text
order_pkg_instance.packed_at = null
```

After the update, each target row has `packed_at` set to the Excel packed date at `12:00:00+00`.

No dimensions, weights, quantities, task logs, `pkd_item.created_at`, `packed_by`, or statuses were changed.

### 2. Supabase report RPC migration

Applied migration:

```text
prefer_instance_packed_at_in_reports
```

The active `public.fetch_report_instances(...)` report function now calculates report packed date as:

```sql
COALESCE(order_pkg_instance.packed_at, MAX(pkd_item.created_at))
```

Before that migration, report packed date/date filtering effectively used:

```sql
MAX(pkd_item.created_at)
```

The migration intentionally does not use `task_logs.end_time`, because reopening/reworking a box should not move the original packed date.

### 3. Local UI code change

Changed:

```text
src/features/reports/components/PackingListPage.tsx
```

Previous local behavior:

```ts
packed_at: status === "packed" ? new Date().toISOString() : null
```

That meant reopening/changing a box away from `packed` could clear the original packed date.

Current local behavior:

```text
If status becomes packed and packed_at is empty:
  set packed_at = now

If packed_at already exists:
  keep it

If status changes away from packed:
  do not clear packed_at
```

Also changed comments in:

```text
src/features/reports/types.ts
```

## Before vs after report count

For the TAQA AIN filter above:

| State | Report date source | Boxes shown |
|---|---|---:|
| Before report migration/backfill effect | `MAX(pkd_item.created_at)` | 11 |
| After current change | `COALESCE(order_pkg_instance.packed_at, MAX(pkd_item.created_at))` | 22 |

Important: the current 22 are not all from the Excel sheet.

Current report output:

- 19 Excel-backed rows
- 3 extra DB-existing rows: `AIN-P-NAC-SB-#03`, `AIN-P-NAC-SB-#04`, `AIN-P-NAC-SB-#05`

Those 3 extra rows were not updated by the backfill. They already had reportable item rows and parent package status `packed`.

## Excel-backed rows: before vs after

`before_packed_at` below is the value observed before the data update for the 19 target rows.

`old_logic_report_date` is reconstructed from the old report logic, using the current `MAX(pkd_item.created_at)` value. This field was not changed by the backfill.

| Ref | Box # | Before `packed_at` | After `packed_at` | Excel date | Old logic report date | Current report date | Items |
|---|---:|---|---|---|---|---|---:|
| `AIN-P-AC-#16` | 51 | `null` | `2026-07-23` | `2026-07-23` | `2026-06-23` | `2026-07-23` | 1 |
| `AIN-P-NAC-#01` | 79 | `null` | `2026-07-21` | `2026-07-21` | `2026-07-22` | `2026-07-21` | 4 |
| `AIN-P-NAC-#15` | 95 | `null` | `2026-07-22` | `2026-07-22` | `2026-07-22` | `2026-07-22` | 5 |
| `AIN-P-NAC-#21.6` | 106 | `null` | `2026-08-05` | `2026-08-05` | `2026-06-23` | `2026-08-05` | 1 |
| `AIN-P-NAC-#21.7` | 107 | `null` | `2026-08-05` | `2026-08-05` | `2026-06-23` | `2026-08-05` | 1 |
| `AIN-P-NAC-SB-#06` | 133 | `null` | `2026-07-21` | `2026-07-21` | `2026-07-21` | `2026-07-21` | 14 |
| `AIN-P-NAC-SB-#07` | 134 | `null` | `2026-07-21` | `2026-07-21` | `2026-07-21` | `2026-07-21` | 9 |
| `AIN-W-AC-#05` | 139 | `null` | `2026-07-23` | `2026-07-23` | `2026-06-23` | `2026-07-23` | 1 |
| `AIN-W-AC-75414-#05.2` | 139 | `null` | `2026-07-23` | `2026-07-23` | `2026-07-22` | `2026-07-23` | 1 |
| `AIN-W-AC-#08` | 142 | `null` | `2026-08-04` | `2026-08-04` | `2026-06-23` | `2026-08-04` | 1 |
| `AIN-W-NAC-#03` | 149 | `null` | `2026-08-03` | `2026-08-03` | `2026-06-23` | `2026-08-03` | 1 |
| `AIN-W-NAC-#06.1` | 152 | `null` | `2026-08-04` | `2026-08-04` | `2026-06-23` | `2026-08-04` | 1 |
| `AIN-W-NAC-#06.2` | 153 | `null` | `2026-08-04` | `2026-08-04` | `2026-06-23` | `2026-08-04` | 1 |
| `AIN-W-NAC-#08` | 155 | `null` | `2026-07-24` | `2026-07-24` | `2026-06-23` | `2026-07-24` | 1 |
| `AIN-W-NAC-#09.1` | 156 | `null` | `2026-07-27` | `2026-07-27` | `2026-06-23` | `2026-07-27` | 1 |
| `AIN-W-NAC-#26` | 174 | `null` | `2026-08-04` | `2026-08-04` | `2026-07-31` | `2026-08-04` | 1 |
| `AIN-W-NAC-SB-#06` | 188 | `null` | `2026-08-03` | `2026-08-03` | `2026-08-03` | `2026-08-03` | 2 |
| `AIN-W-NAC-#34` | 332 | `null` | `2026-07-30` | `2026-07-30` | `2026-07-11` | `2026-07-30` | 1 |
| `AIN-W-AC-#09` | 335 | `null` | `2026-08-04` | `2026-08-04` | `2026-08-03` | `2026-08-04` | 1 |

## Rows that appeared as extra against the Excel sheet

These 3 rows are in the current report output but were not in the Excel rows shared in chat.

They were not changed by the `packed_at` backfill:

| Ref | Box # | Instance status | Package status | `packed_at` | Old logic report date | Current report date | Items |
|---|---:|---|---|---|---|---|---:|
| `AIN-P-NAC-SB-#03` | 130 | `design` | `packed` | `null` | `2026-07-21` | `2026-07-21` | 6 |
| `AIN-P-NAC-SB-#04` | 131 | `design` | `packed` | `null` | `2026-07-21` | `2026-07-21` | 12 |
| `AIN-P-NAC-SB-#05` | 132 | `design` | `packed` | `null` | `2026-07-21` | `2026-07-21` | 13 |

Conclusion for these 3:

- They did not appear because of the `packed_at` backfill.
- They already had `pkd_item` rows inside the report date range.
- The report labels them packed because parent `order_package.status = packed`.
- The unresolved business/data question is whether these 3 DB boxes should be excluded/unpacked/removed, or whether Excel is missing them.

## What reverting would do

If we revert everything from this conflict work:

### Revert DB `packed_at` backfill

Would set the 19 Excel-backed rows back to:

```text
order_pkg_instance.packed_at = null
```

Impact:

- The report would lose the Excel packed dates.
- Many boxes would fall back to old `pkd_item.created_at` dates such as `2026-06-23`, `2026-07-11`, or `2026-07-22`.
- The report for the same date range would likely return the old 11-box shape instead of the current 22-box shape.

### Revert report RPC migration

Would restore date filtering/report date to:

```sql
MAX(pkd_item.created_at)
```

Impact:

- Reopened/relinked/reworked item activity could again shift the report packed date.
- The report would no longer prefer the stable `order_pkg_instance.packed_at`.

### Revert local UI code

Would restore behavior where status changes can clear packed date:

```ts
packed_at: status === "packed" ? new Date().toISOString() : null
```

Impact:

- Reopening a packed box could again erase `packed_at`.
- Marking packed again would overwrite with the current time instead of preserving the original packed date.

## Recommendation before reverting

Do not revert blindly.

The fix itself is protecting the original packed date, which matches the stated rule:

```text
If a box is reopened, that should not affect the initial packed date.
```

The real remaining conflict is:

```text
Excel expected: 19 boxes
Current DB report: 22 boxes
Difference: 3 DB-existing boxes #03, #04, #05
```

Recommended next decision:

1. If Excel is absolute source of truth for the report, handle only the 3 extra DB boxes.
2. If DB is allowed to have extra packed boxes beyond Excel, keep current fix and document why the report shows 22.
3. If we need a full revert, prepare a specific revert migration and a local code revert, then run verification immediately after.
