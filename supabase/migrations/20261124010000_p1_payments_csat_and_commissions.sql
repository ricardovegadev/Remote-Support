-- ============================================================================
-- Migration: 20261124010000_p1_payments_csat_and_commissions.sql
-- Phase 3 P1 Commercial Launch Readiness:
--   1. Immutable public.payments ledger with commission split (65% - 85%)
--   2. CSAT (1-5 stars), client confirmation & dispute columns on public.tickets
--   3. Admin ticket reassignment/unclaim RPC (admin_reassign_ticket)
-- ============================================================================

-- 1. CSAT & client resolution confirmation / dispute columns on public.tickets
alter table public.tickets
  add column if not exists csat_rating integer
    check (csat_rating is null or (csat_rating >= 1 and csat_rating <= 5)),
  add column if not exists csat_comment text,
  add column if not exists client_confirmed_at timestamptz,
  add column if not exists dispute_reason text,
  add column if not exists disputed_at timestamptz;

-- 2. Immutable financial ledger: public.payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  technician_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('stripe', 'paypal', 'sandbox')),
  provider_reference text not null,
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  commission_percent integer not null default 65
    check (commission_percent in (65, 75, 80, 85)),
  technician_payout_usd numeric(10, 2) not null default 0 check (technician_payout_usd >= 0),
  platform_fee_usd numeric(10, 2) not null default 0 check (platform_fee_usd >= 0),
  status text not null default 'paid'
    check (status in ('paid', 'refunded', 'disputed')),
  created_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create index if not exists idx_payments_org_created
  on public.payments (organization_id, created_at desc);

create index if not exists idx_payments_technician
  on public.payments (technician_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "payments_select_org_admin_or_assigned" on public.payments;
create policy "payments_select_org_admin_or_assigned"
  on public.payments for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or technician_id = auth.uid()
  );

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- Re-grant newly added CSAT columns on public.tickets for authenticated SELECT
grant select (csat_rating, csat_comment, client_confirmed_at, dispute_reason, disputed_at)
  on public.tickets to authenticated;

-- 3. Admin Reassign / Unclaim RPC (handles technician no-show safely)
create or replace function public.admin_reassign_ticket(
  p_ticket_id uuid,
  p_next_tech_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid;
  v_next_name text;
  v_next_specialty text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select organization_id into v_org_id
  from public.tickets
  where id = p_ticket_id
  for update;

  if not found or v_org_id is null or not public.is_org_admin(v_org_id) then
    return false;
  end if;

  if p_next_tech_id is null then
    update public.tickets
    set assigned_to = null,
        assigned_technician_id = null,
        assigned_technician_name = null,
        assigned_technician_specialty = null,
        status = case when payment_status = 'paid' then 'ready_to_connect' else 'waiting_payment' end,
        claimed_at = null
    where id = p_ticket_id
      and status <> 'resolved';
    return found;
  end if;

  if not exists (
    select 1 from public.organization_members om
    where om.organization_id = v_org_id
      and om.user_id = p_next_tech_id
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'technician')
  ) then
    return false;
  end if;

  select
    coalesce(tp.full_name, p.full_name, 'Técnico Asignado'),
    coalesce(nullif(array_to_string(tp.specialties, ' · '), ''), p.specialty, 'Especialista Verificado')
  into v_next_name, v_next_specialty
  from public.profiles p
  left join public.technician_profiles tp on tp.user_id = p.id
  where p.id = p_next_tech_id;

  update public.tickets
  set assigned_to = p_next_tech_id,
      assigned_technician_id = p_next_tech_id,
      assigned_technician_name = coalesce(v_next_name, 'Técnico Asignado'),
      assigned_technician_specialty = coalesce(v_next_specialty, 'Especialista Verificado'),
      status = 'in_progress',
      claimed_at = now()
  where id = p_ticket_id
    and payment_status = 'paid'
    and status <> 'resolved';

  return found;
end;
$$;

revoke all on function public.admin_reassign_ticket(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_reassign_ticket(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
