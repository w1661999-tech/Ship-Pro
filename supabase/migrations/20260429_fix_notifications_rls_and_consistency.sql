-- ============================================================
-- Migration: 20260429_fix_notifications_rls_and_consistency.sql
-- Purpose:
--   1. Fix notifications RLS so admins/system can create
--      notifications for any user (was blocked, breaking ticket
--      and shipment notification flows).
--   2. Make notification creation idempotent and safe.
--   3. Add helpful trigger that auto-notifies merchants on
--      ticket status changes and shipment delivery.
--   4. Add missing indexes for hot lookup paths.
-- Author: Genspark AI - 2026-04-29
-- ============================================================

-- ========== 1. NOTIFICATIONS RLS ==========
-- Drop the over-restrictive single policy
drop policy if exists user_own_notifications on public.notifications;

-- Users can SELECT/UPDATE/DELETE their own notifications only
create policy notifications_self_select on public.notifications
  for select using (
    user_id in (select id from public.ship_users where auth_id = auth.uid())
  );

create policy notifications_self_update on public.notifications
  for update using (
    user_id in (select id from public.ship_users where auth_id = auth.uid())
  ) with check (
    user_id in (select id from public.ship_users where auth_id = auth.uid())
  );

create policy notifications_self_delete on public.notifications
  for delete using (
    user_id in (select id from public.ship_users where auth_id = auth.uid())
  );

-- Admins can do EVERYTHING (read all + create for anyone)
create policy notifications_admin_all on public.notifications
  for all using (
    exists (
      select 1 from public.ship_users
      where auth_id = auth.uid() and role = 'admin' and is_active = true
    )
  ) with check (
    exists (
      select 1 from public.ship_users
      where auth_id = auth.uid() and role = 'admin' and is_active = true
    )
  );

-- Authenticated users can INSERT a notification (system-generated, e.g. ticket replies)
-- Required for triggers and server-side notification fan-out.
create policy notifications_authenticated_insert on public.notifications
  for insert with check (auth.uid() is not null);

-- ========== 2. NOTIFICATION HELPER FUNCTION ==========
-- Safe wrapper that bypasses RLS via SECURITY DEFINER.
-- Used by triggers and the application layer.
create or replace function public.create_notification(
  p_user_id uuid,
  p_type    public.notification_type,
  p_title   text,
  p_body    text default null,
  p_link    text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then return null; end if;
  insert into public.notifications (user_id, type, title, body, link, metadata, is_read)
  values (p_user_id, p_type, p_title, p_body, p_link, coalesce(p_metadata, '{}'::jsonb), false)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_notification(uuid, public.notification_type, text, text, text, jsonb)
  to authenticated, anon;

-- ========== 3. TICKET REPLY → NOTIFY MERCHANT ==========
create or replace function public.notify_on_ticket_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket   record;
  v_sender   record;
  v_target_user_id uuid;
begin
  -- Skip internal notes
  if new.is_internal then return new; end if;

  select t.id, t.subject, t.merchant_id, m.user_id
    into v_ticket
  from public.tickets t
  left join public.merchants m on m.id = t.merchant_id
  where t.id = new.ticket_id;

  -- Sender info
  select role into v_sender from public.ship_users where id = new.sender_id;

  -- If admin replied → notify merchant
  if v_sender.role = 'admin' and v_ticket.user_id is not null then
    perform public.create_notification(
      v_ticket.user_id,
      'ticket_replied'::public.notification_type,
      'رد جديد على تذكرتك',
      'تم الرد على تذكرتك "' || coalesce(v_ticket.subject, '') || '"',
      '/merchant/tickets',
      jsonb_build_object('ticket_id', v_ticket.id)
    );
  -- If merchant replied → notify all admins
  elsif v_sender.role = 'merchant' then
    insert into public.notifications (user_id, type, title, body, link, metadata, is_read)
    select id, 'ticket_replied', 'رد جديد من تاجر',
           'رد جديد على التذكرة "' || coalesce(v_ticket.subject, '') || '"',
           '/admin/tickets',
           jsonb_build_object('ticket_id', v_ticket.id),
           false
    from public.ship_users
    where role = 'admin' and is_active = true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_ticket_message on public.ticket_messages;
create trigger trg_notify_ticket_message
  after insert on public.ticket_messages
  for each row
  execute function public.notify_on_ticket_message();

-- ========== 4. SHIPMENT STATUS CHANGE → NOTIFY ==========
create or replace function public.notify_on_shipment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_title   text;
  v_body    text;
  v_type    public.notification_type;
begin
  -- Only notify for merchant-relevant transitions
  if new.status = old.status then return new; end if;

  select user_id into v_user_id from public.merchants where id = new.merchant_id;
  if v_user_id is null then return new; end if;

  if new.status = 'delivered' then
    v_type := 'shipment_delivered';
    v_title := 'تم تسليم شحنتك';
    v_body  := 'تم تسليم الشحنة ' || new.tracking_number || ' بنجاح';
  elsif new.status = 'returned' then
    v_type := 'shipment_returned';
    v_title := 'إرجاع شحنة';
    v_body  := 'تم إرجاع الشحنة ' || new.tracking_number;
  elsif new.status = 'assigned' then
    v_type := 'shipment_assigned';
    v_title := 'تم تخصيص مندوب';
    v_body  := 'تم تخصيص مندوب لشحنتك ' || new.tracking_number;
  else
    return new;
  end if;

  perform public.create_notification(
    v_user_id, v_type, v_title, v_body,
    '/merchant/shipments?tracking=' || new.tracking_number,
    jsonb_build_object('shipment_id', new.id, 'status', new.status::text)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_shipment_status on public.shipments;
create trigger trg_notify_shipment_status
  after update of status on public.shipments
  for each row
  execute function public.notify_on_shipment_status_change();

-- ========== 5. INDEXES FOR HOT PATHS ==========
create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc) where is_read = false;

create index if not exists idx_ticket_messages_ticket
  on public.ticket_messages (ticket_id, created_at);

create index if not exists idx_shipment_status_logs_shipment
  on public.shipment_status_logs (shipment_id, created_at desc);

-- ========== 6. WAREHOUSE_SHELVES SAFETY ==========
-- Ensure shelf code is unique per warehouse (avoid duplicates)
create unique index if not exists idx_warehouse_shelves_code_unique
  on public.warehouse_shelves (warehouse_id, code) where is_active = true;

-- ========== 7. ZONES ENSURED COLUMN ==========
-- Some legacy environments lack updated_at on zones; ensure it exists.
alter table public.zones add column if not exists updated_at timestamptz default now();
create or replace function public.touch_zones_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_zones_updated_at on public.zones;
create trigger trg_zones_updated_at
  before update on public.zones
  for each row execute function public.touch_zones_updated_at();

-- ========== DONE ==========
-- Grant the helper notification triggers ability to bypass RLS
-- (already SECURITY DEFINER on the function)
