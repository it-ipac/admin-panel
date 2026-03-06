# Inventory Supplier Communications Setup

This feature sends grouped supplier emails via Resend and tracks messages in Supabase.

## Required server env vars

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (verified sender/domain in Resend)
- `RESEND_REPLY_TO_EMAIL` (optional; one email or comma-separated list)
- `RESEND_CC_EMAIL` (optional; one email or comma-separated list)
- `SUPABASE_URL` (or `VITE_SUPABASE_URL`) 
- `SUPABASE_SECRET_KEY` (preferred; legacy fallback: `SUPABASE_SERVICE_ROLE_KEY`)
- `RESEND_INBOUND_WEBHOOK_SECRET`

## Required table

Run this SQL in Supabase:

```sql
create table if not exists public.supplier_email_messages (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid null references public.suppliers(id) on delete set null,
  supplier_name text null,
  supplier_email text not null,
  direction text not null check (direction in ('outbound', 'inbound')),
  reason text null,
  subject text not null,
  body_text text not null,
  resend_email_id text null,
  in_reply_to_resend_email_id text null,
  status text null,
  related_variant_ids jsonb not null default '[]'::jsonb,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_supplier_email_messages_created_at
  on public.supplier_email_messages(created_at desc);

create index if not exists idx_supplier_email_messages_supplier_id
  on public.supplier_email_messages(supplier_id);

create unique index if not exists uq_supplier_email_messages_resend_email_id
  on public.supplier_email_messages(resend_email_id)
  where resend_email_id is not null;
```

## Inbound tracking

Your inbound pipeline should insert incoming emails into `supplier_email_messages` with:

- `direction = 'inbound'`
- `resend_email_id` set to inbound message id (when available)
- `in_reply_to_resend_email_id` set if provided by inbound payload

Once inbound rows exist, the admin panel will show them in history and allow reply threading from the grouped draft cards.

## Resend inbound webhook endpoint

This project now includes a verified inbound endpoint:

- `POST /api/webhooks/resend/inbound`

In Resend webhook settings:

1. Add endpoint URL: `https://<your-domain>/api/webhooks/resend/inbound`
2. Subscribe to inbound event (`email.received`)
3. Copy Resend webhook signing secret to `RESEND_INBOUND_WEBHOOK_SECRET`

The endpoint verifies `svix-*` headers using `svix`, then inserts into
`supplier_email_messages` with `direction = 'inbound'`.

It also applies idempotency for retries:

- Checks for existing row by `resend_email_id` before insert
- Gracefully handles DB unique conflict (`23505`) and returns success
