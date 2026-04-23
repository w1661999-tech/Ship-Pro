-- Ship Pro Enterprise Modules v2
-- Tickets, WMS, Manifests, Notifications, Audit, Webhooks, POD

-- Enums
do $$ begin create type ticket_status as enum ('open','in_progress','resolved','closed'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_priority as enum ('low','medium','high','urgent'); exception when duplicate_object then null; end $$;
do $$ begin create type manifest_status as enum ('draft','printed','signed','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type notification_type as enum ('shipment_created','shipment_assigned','shipment_delivered','shipment_returned','settlement_requested','settlement_approved','settlement_paid','ticket_created','ticket_replied','ticket_resolved','system'); exception when duplicate_object then null; end $$;
do $$ begin create type webhook_provider as enum ('shopify','woocommerce','salla','zid','custom'); exception when duplicate_object then null; end $$;
do $$ begin create type pod_type as enum ('photo','signature','gps','note'); exception when duplicate_object then null; end $$;

-- Tickets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete set null,
  subject text not null,
  description text not null,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  created_by uuid references public.ship_users(id),
  assigned_to uuid references public.ship_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists idx_tickets_merchant on public.tickets(merchant_id);
create index if not exists idx_tickets_status on public.tickets(status);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid references public.ship_users(id),
  message text not null,
  attachments jsonb default '[]'::jsonb,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_messages_ticket on public.ticket_messages(ticket_id);

-- WMS
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  zone_id uuid references public.zones(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.warehouse_shelves (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  code text not null,
  name text,
  capacity integer default 100,
  current_count integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(warehouse_id, code)
);
create index if not exists idx_shelves_warehouse on public.warehouse_shelves(warehouse_id);

create table if not exists public.shipment_shelf_assignments (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  shelf_id uuid not null references public.warehouse_shelves(id) on delete cascade,
  assigned_by uuid references public.ship_users(id),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_shelf_assign_shipment on public.shipment_shelf_assignments(shipment_id);

-- Manifests
create table if not exists public.manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_no text not null unique,
  courier_id uuid not null references public.couriers(id),
  status manifest_status not null default 'draft',
  total_shipments integer not null default 0,
  total_cod numeric not null default 0,
  notes text,
  pdf_url text,
  signature_url text,
  created_by uuid references public.ship_users(id),
  created_at timestamptz not null default now(),
  printed_at timestamptz,
  signed_at timestamptz,
  completed_at timestamptz
);
create index if not exists idx_manifests_courier on public.manifests(courier_id);

create table if not exists public.manifest_items (
  id uuid primary key default gen_random_uuid(),
  manifest_id uuid not null references public.manifests(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(manifest_id, shipment_id)
);
create index if not exists idx_manifest_items_manifest on public.manifest_items(manifest_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ship_users(id) on delete cascade,
  type notification_type not null default 'system',
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read);

-- Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.ship_users(id),
  actor_email text,
  table_name text not null,
  record_id text,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_table on public.audit_logs(table_name, created_at desc);
create index if not exists idx_audit_actor on public.audit_logs(actor_id, created_at desc);

-- Webhooks
create table if not exists public.integration_webhooks (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  provider webhook_provider not null,
  store_url text,
  endpoint_url text,
  secret text,
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  total_orders integer default 0,
  failed_count integer default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_webhooks_merchant on public.integration_webhooks(merchant_id);

-- POD (Proof of Delivery)
create table if not exists public.pod_artifacts (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  courier_id uuid references public.couriers(id),
  type pod_type not null,
  url text,
  lat numeric,
  lng numeric,
  note text,
  captured_at timestamptz not null default now()
);
create index if not exists idx_pod_shipment on public.pod_artifacts(shipment_id);

-- Updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_tickets_updated on public.tickets;
create trigger trg_tickets_updated before update on public.tickets for each row execute function public.set_updated_at();

-- RLS
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.warehouses enable row level security;
alter table public.warehouse_shelves enable row level security;
alter table public.shipment_shelf_assignments enable row level security;
alter table public.manifests enable row level security;
alter table public.manifest_items enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.integration_webhooks enable row level security;
alter table public.pod_artifacts enable row level security;

-- Admin can do everything
drop policy if exists "admin_all_tickets" on public.tickets;
create policy "admin_all_tickets" on public.tickets for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "merchant_own_tickets" on public.tickets;
create policy "merchant_own_tickets" on public.tickets for all
  using (merchant_id in (select id from public.merchants where user_id in (select id from public.ship_users where auth_id = auth.uid())))
  with check (merchant_id in (select id from public.merchants where user_id in (select id from public.ship_users where auth_id = auth.uid())));

drop policy if exists "admin_all_ticket_msg" on public.ticket_messages;
create policy "admin_all_ticket_msg" on public.ticket_messages for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "merchant_own_ticket_msg" on public.ticket_messages;
create policy "merchant_own_ticket_msg" on public.ticket_messages for all
  using (ticket_id in (select id from public.tickets where merchant_id in (select id from public.merchants where user_id in (select id from public.ship_users where auth_id = auth.uid()))))
  with check (ticket_id in (select id from public.tickets where merchant_id in (select id from public.merchants where user_id in (select id from public.ship_users where auth_id = auth.uid()))));

drop policy if exists "admin_warehouses" on public.warehouses;
create policy "admin_warehouses" on public.warehouses for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "admin_shelves" on public.warehouse_shelves;
create policy "admin_shelves" on public.warehouse_shelves for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "admin_assignments" on public.shipment_shelf_assignments;
create policy "admin_assignments" on public.shipment_shelf_assignments for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "admin_manifests" on public.manifests;
create policy "admin_manifests" on public.manifests for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "courier_own_manifests" on public.manifests;
create policy "courier_own_manifests" on public.manifests for select
  using (courier_id in (select id from public.couriers where user_id in (select id from public.ship_users where auth_id = auth.uid())));

drop policy if exists "admin_manifest_items" on public.manifest_items;
create policy "admin_manifest_items" on public.manifest_items for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "user_own_notifications" on public.notifications;
create policy "user_own_notifications" on public.notifications for all
  using (user_id in (select id from public.ship_users where auth_id = auth.uid()))
  with check (user_id in (select id from public.ship_users where auth_id = auth.uid()));

drop policy if exists "admin_audit_logs" on public.audit_logs;
create policy "admin_audit_logs" on public.audit_logs for select
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'));

drop policy if exists "admin_webhooks" on public.integration_webhooks;
create policy "admin_webhooks" on public.integration_webhooks for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "merchant_own_webhooks" on public.integration_webhooks;
create policy "merchant_own_webhooks" on public.integration_webhooks for all
  using (merchant_id in (select id from public.merchants where user_id in (select id from public.ship_users where auth_id = auth.uid())))
  with check (merchant_id in (select id from public.merchants where user_id in (select id from public.ship_users where auth_id = auth.uid())));

drop policy if exists "admin_pod" on public.pod_artifacts;
create policy "admin_pod" on public.pod_artifacts for all
  using (exists (select 1 from public.ship_users where auth_id = auth.uid() and role = 'admin'))
  with check (true);

drop policy if exists "courier_own_pod" on public.pod_artifacts;
create policy "courier_own_pod" on public.pod_artifacts for all
  using (courier_id in (select id from public.couriers where user_id in (select id from public.ship_users where auth_id = auth.uid())))
  with check (courier_id in (select id from public.couriers where user_id in (select id from public.ship_users where auth_id = auth.uid())));

-- Add notifications to realtime publication
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null;
end $$;
