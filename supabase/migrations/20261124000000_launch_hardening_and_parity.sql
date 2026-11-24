-- ============================================================================
-- Migration: 20261124000000_launch_hardening_and_parity.sql
-- Phase 3 P0 Launch Hardening & Schema Parity for Remote Support 365
--   1. Isolate client_session_token from authenticated SELECT & RPC outputs
--   2. Auto-purge temporary rustdesk_id upon ticket resolution
--   3. Add client_nda_version / client_nda_accepted_at and unify ai_diagnosis jsonb
--   4. Schema parity: remote_sessions, ai_agents_config, enterprise_leads,
--      and handle_new_user() with SQL-side +18 verification
--   5. Least-privilege column GRANTs on organizations, audit_logs, ticket_messages
-- ============================================================================

-- 1. Client NDA traceability columns & ai_diagnosis jsonb alignment
alter table public.tickets
  add column if not exists client_nda_version text,
  add column if not exists client_nda_accepted_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tickets'
      and column_name = 'ai_diagnosis'
      and data_type <> 'jsonb'
  ) then
    alter table public.tickets
      alter column ai_diagnosis type jsonb
      using case
        when ai_diagnosis is null or btrim(ai_diagnosis::text) = '' then '{}'::jsonb
        else ai_diagnosis::jsonb
      end;
  end if;
end $$;

-- 2. Parity tables missing from incremental migrations
create table if not exists public.remote_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete set null,
  ticket_code text not null default '',
  client_name text not null default '',
  technician_id uuid references auth.users(id) on delete set null,
  technician_name text not null default '',
  rustdesk_id text not null default '',
  agent_type text not null default 'temporary'
    check (agent_type in ('temporary', 'installed')),
  status text not null default 'active'
    check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer not null default 0
);

create index if not exists idx_remote_sessions_org_started
  on public.remote_sessions (organization_id, started_at desc);

alter table public.remote_sessions enable row level security;

drop policy if exists "remote_sessions_select_org_member" on public.remote_sessions;
create policy "remote_sessions_select_org_member"
  on public.remote_sessions for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "remote_sessions_manage_org_member" on public.remote_sessions;
create policy "remote_sessions_manage_org_member"
  on public.remote_sessions for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.ai_agents_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_key text not null,
  agent_name text not null,
  role_description text not null default '',
  is_enabled boolean not null default true,
  governance_rules jsonb not null default '[]'::jsonb,
  credits_used integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_key)
);

alter table public.ai_agents_config enable row level security;

drop policy if exists "ai_agents_select_org_member" on public.ai_agents_config;
create policy "ai_agents_select_org_member"
  on public.ai_agents_config for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "ai_agents_manage_org_admin" on public.ai_agents_config;
create policy "ai_agents_manage_org_admin"
  on public.ai_agents_config for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create table if not exists public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_email text not null,
  team_size text not null default '1-5',
  plan_interest text,
  created_at timestamptz not null default now()
);

alter table public.enterprise_leads enable row level security;

drop policy if exists "enterprise_leads_select_hq_admin" on public.enterprise_leads;
create policy "enterprise_leads_select_hq_admin"
  on public.enterprise_leads for select to authenticated
  using (public.is_org_admin('00000000-0000-4000-8000-000000000001'::uuid));

revoke all on public.enterprise_leads from anon, authenticated;
grant select on public.enterprise_leads to authenticated;

-- 3. SQL-enforced +18 verification in handle_new_user()
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_birth_raw text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'birth_date', '')), '');
  v_birth_date date;
  v_is_adult boolean := false;
begin
  if v_birth_raw ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      v_birth_date := v_birth_raw::date;
      v_is_adult := (v_birth_date <= (current_date - interval '18 years')::date);
    exception when others then
      v_birth_date := null;
      v_is_adult := false;
    end;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    birth_date,
    is_adult_verified,
    terms_accepted_at,
    terms_version,
    marketing_opt_in
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    'client',
    v_birth_date,
    v_is_adult,
    case
      when coalesce(new.raw_user_meta_data ->> 'terms_accepted_at', '') <> ''
      then (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz
      else null
    end,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'terms_version'), ''), 'v1.0-2026'),
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 4. Least-privilege column GRANTs (isolate client_session_token, protect plan_tier & server timestamps)
revoke select on public.tickets from authenticated;
grant select (
  id,
  ticket_code,
  organization_id,
  organization_name,
  category,
  os_type,
  service_tier,
  billing_mode,
  priority,
  problem_description,
  ai_diagnosis_summary,
  ai_diagnosis,
  client_name,
  client_email,
  client_birth_date,
  is_adult_verified,
  terms_accepted_at,
  terms_version,
  marketing_opt_in,
  subscription_status,
  anonymized_at,
  rustdesk_id,
  agent_type,
  agent_downloaded,
  consent_accepted,
  consent_accepted_at,
  client_nda_version,
  client_nda_accepted_at,
  payment_status,
  payment_reference,
  paid_at,
  status,
  assigned_to,
  assigned_technician_id,
  assigned_technician_name,
  assigned_technician_specialty,
  resolution_notes,
  claimed_at,
  resolved_at,
  created_at,
  stripe_subscription_id
) on public.tickets to authenticated;

revoke update on public.organizations from authenticated;
grant update (
  name,
  dispatch_mode,
  rustdesk_relay_domain,
  payment_gateway,
  subscription_auto_renew,
  subscription_canceled_at
) on public.organizations to authenticated;

revoke insert on public.ticket_messages from authenticated;
grant insert (id, ticket_id, sender_role, message)
  on public.ticket_messages to authenticated;

revoke insert on public.audit_logs from authenticated;
grant insert (id, organization_id, actor_type, actor_label, action, target_ref)
  on public.audit_logs to authenticated;

-- 5. Hardened claim_ticket_atomically (exclude client_session_token, block anonymized tickets)
create or replace function public.claim_ticket_atomically(p_ticket_id uuid, p_tech_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_ticket public.tickets%rowtype;
  v_tech_name text;
  v_tech_specialty text;
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null or v_caller_id <> p_tech_id then
    return jsonb_build_object('claimed', false, 'reason', 'Autenticación técnica requerida.');
  end if;

  if not exists (
    select 1 from public.organization_members om
    where om.user_id = v_caller_id
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'technician')
  ) then
    return jsonb_build_object('claimed', false, 'reason', 'Técnico no autorizado.');
  end if;

  select
    coalesce(tp.full_name, p.full_name, 'Técnico Asignado'),
    coalesce(nullif(array_to_string(tp.specialties, ' · '), ''), p.specialty, 'Especialista Verificado')
  into v_tech_name, v_tech_specialty
  from public.profiles p
  left join public.technician_profiles tp on tp.user_id = p.id
  where p.id = v_caller_id;

  update public.tickets
  set
    assigned_to = v_caller_id,
    assigned_technician_id = v_caller_id,
    assigned_technician_name = coalesce(v_tech_name, 'Técnico Asignado'),
    assigned_technician_specialty = coalesce(v_tech_specialty, 'Especialista Verificado'),
    status = 'in_progress',
    claimed_at = now()
  where id = p_ticket_id
    and assigned_to is null
    and anonymized_at is null
    and payment_status = 'paid'
    and status in ('waiting_payment', 'ready_to_connect')
    and exists (
      select 1 from public.organization_members om
      where om.user_id = v_caller_id
        and om.organization_id = tickets.organization_id
        and om.status = 'active'
        and om.role in ('owner', 'admin', 'technician')
    )
  returning * into v_ticket;

  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'El ticket no está disponible.');
  end if;

  return jsonb_build_object(
    'claimed',
    true,
    'ticket',
    to_jsonb(v_ticket) - 'client_session_token'
  );
end;
$$;
revoke all on function public.claim_ticket_atomically(uuid,uuid) from public, anon, authenticated;
grant execute on function public.claim_ticket_atomically(uuid,uuid) to authenticated;

-- 6. Hardened update_ticket_as_staff (auto-purge temporary rustdesk_id on resolution)
create or replace function public.update_ticket_as_staff(
  p_ticket_id uuid,
  p_status text,
  p_resolution_notes text default null,
  p_resolved_at timestamptz default null
)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_org_id uuid;
  v_assigned_to uuid;
  v_payment_status text;
  v_current_status text;
  v_agent_type text;
begin
  if auth.uid() is null or p_status is null or p_status not in ('in_progress', 'resolved') then
    return false;
  end if;

  select organization_id, assigned_to, payment_status, status, agent_type
    into v_org_id, v_assigned_to, v_payment_status, v_current_status, v_agent_type
  from public.tickets
  where id = p_ticket_id
  for update;

  if not found or v_org_id is null or v_payment_status <> 'paid' then
    return false;
  end if;
  if not public.is_org_member(v_org_id) then
    return false;
  end if;
  if v_assigned_to is distinct from auth.uid() and not public.is_org_admin(v_org_id) then
    return false;
  end if;
  if p_status = 'resolved' and (v_current_status <> 'in_progress' or p_resolved_at is null) then
    return false;
  end if;
  if p_status = 'in_progress' and v_current_status not in ('ready_to_connect', 'in_progress', 'resolved') then
    return false;
  end if;
  if p_resolution_notes is not null and char_length(p_resolution_notes) > 5000 then
    return false;
  end if;

  update public.tickets
  set status = p_status,
      resolution_notes = coalesce(p_resolution_notes, resolution_notes),
      resolved_at = case
        when p_status = 'in_progress' then null
        else coalesce(p_resolved_at, now())
      end,
      rustdesk_id = case
        when p_status = 'resolved' and v_agent_type = 'temporary' then null
        else rustdesk_id
      end
  where id = p_ticket_id;

  return found;
end;
$$;
revoke all on function public.update_ticket_as_staff(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.update_ticket_as_staff(uuid, text, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';
