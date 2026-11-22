-- Remote Support 365: emergency authorization repair and schema alignment.
-- Apply this migration to the connected project only after taking a database backup.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'client' check (role in ('client', 'technician', 'admin')),
  specialty text,
  rating numeric(3,2) not null default 5 check (rating between 0 and 5),
  is_verified boolean not null default false,
  birth_date date,
  is_adult_verified boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.technician_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  email text not null unique,
  specialties text[] not null default '{}',
  availability_status text not null default 'available'
    check (availability_status in ('available', 'busy', 'paused', 'offline')),
  accepting_requests boolean not null default true,
  is_verified boolean not null default false,
  active_sessions_count integer not null default 0,
  rating numeric(3,2) not null default 5 check (rating between 0 and 5),
  updated_at timestamptz not null default now()
);

alter table public.technician_profiles
  add column if not exists is_verified boolean not null default false,
  add column if not exists active_sessions_count integer not null default 0;

alter table public.tickets
  add column if not exists organization_name text,
  add column if not exists ai_diagnosis text,
  add column if not exists ai_diagnosis_summary text,
  add column if not exists billing_mode text not null default 'one_time',
  add column if not exists subscription_status text not null default 'none',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_subscription_id text,
  add column if not exists client_birth_date date,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists agent_type text,
  add column if not exists agent_downloaded boolean not null default false,
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists assigned_technician_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_technician_name text,
  add column if not exists assigned_technician_specialty text,
  add column if not exists claimed_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists anonymized_at timestamptz;
alter table public.tickets alter column is_adult_verified set default false;

create unique index if not exists idx_tickets_payment_reference
  on public.tickets (payment_reference) where payment_reference is not null;
create unique index if not exists idx_tickets_stripe_subscription_id
  on public.tickets (stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists idx_tickets_organization_id on public.tickets (organization_id);
create index if not exists idx_tickets_assigned_technician_id on public.tickets (assigned_technician_id);
create index if not exists idx_ticket_messages_ticket_id on public.ticket_messages (ticket_id);
create index if not exists idx_client_devices_organization_id on public.client_devices (organization_id);
create index if not exists idx_audit_logs_organization_id on public.audit_logs (organization_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.technician_profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.client_devices enable row level security;
alter table public.audit_logs enable row level security;

-- Remove every legacy policy, including policies with localized names.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('organizations','profiles','organization_members','technician_profiles',
                        'tickets','ticket_messages','client_devices','audit_logs')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

revoke all on public.organizations, public.profiles, public.organization_members,
  public.technician_profiles, public.tickets, public.ticket_messages,
  public.client_devices, public.audit_logs from public, anon, authenticated;

create or replace function public.request_header(header_name text)
returns text language plpgsql stable set search_path = pg_catalog, public as $$
declare headers_raw text;
begin
  headers_raw := nullif(current_setting('request.headers', true), '');
  return case when headers_raw is null then null else headers_raw::jsonb ->> lower(header_name) end;
exception when others then return null;
end;
$$;

create or replace function public.is_client_room_authorized(row_ticket_code text, row_token text)
returns boolean language sql stable set search_path = pg_catalog, public as $$
  select row_ticket_code = public.request_header('x-ticket-code')
     and row_token = public.request_header('x-ticket-token')
     and row_ticket_code is not null and row_token is not null;
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = p_org_id and om.user_id = auth.uid() and om.status = 'active'
    ) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = p_org_id and om.user_id = auth.uid()
        and om.status = 'active' and om.role in ('owner','admin')
    ) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
$$;

revoke all on function public.request_header(text), public.is_client_room_authorized(text,text),
  public.is_org_member(uuid), public.is_org_admin(uuid) from public, anon, authenticated;
grant execute on function public.request_header(text), public.is_client_room_authorized(text,text) to anon, authenticated;
grant execute on function public.is_org_member(uuid), public.is_org_admin(uuid) to authenticated;

create policy organizations_member_read on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy organizations_admin_update on public.organizations for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy members_org_read on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));
create policy members_admin_manage on public.organization_members for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy technicians_org_read on public.technician_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy technicians_org_update on public.technician_profiles for update to authenticated
  using ((user_id = auth.uid() and public.is_org_member(organization_id)) or public.is_org_admin(organization_id))
  with check ((user_id = auth.uid() and public.is_org_member(organization_id)) or public.is_org_admin(organization_id));
create policy tickets_staff_read on public.tickets for select to authenticated
  using (public.is_org_member(organization_id));
create policy tickets_room_read on public.tickets for select to anon, authenticated
  using (public.is_client_room_authorized(ticket_code, client_session_token));
create policy tickets_room_update on public.tickets for update to anon
  using (public.is_client_room_authorized(ticket_code, client_session_token))
  with check (public.is_client_room_authorized(ticket_code, client_session_token)
    and payment_status in ('pending','paid') and status in ('waiting_payment','ready_to_connect','in_progress'));
create policy messages_staff_read on public.ticket_messages for select to authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_messages.ticket_id and public.is_org_member(t.organization_id))
);
create policy messages_staff_insert on public.ticket_messages for insert to authenticated with check (
  sender_role = 'technician' and exists (
    select 1 from public.tickets t where t.id = ticket_messages.ticket_id and public.is_org_member(t.organization_id)
  )
);
create policy messages_room_read on public.ticket_messages for select to anon, authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_messages.ticket_id and public.is_client_room_authorized(t.ticket_code,t.client_session_token))
);
create policy messages_room_insert on public.ticket_messages for insert to anon, authenticated with check (
  sender_role = 'client' and exists (select 1 from public.tickets t where t.id = ticket_messages.ticket_id and public.is_client_room_authorized(t.ticket_code,t.client_session_token))
);
create policy devices_member_read on public.client_devices for select to authenticated using (public.is_org_member(organization_id));
create policy devices_admin_manage on public.client_devices for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy audit_member_read on public.audit_logs for select to authenticated using (public.is_org_member(organization_id));
create policy audit_member_insert on public.audit_logs for insert to authenticated with check (
  organization_id is not null and public.is_org_member(organization_id) and actor_type in ('technician', 'ai_agent')
);

-- Column-scoped grants: never allow anon INSERT on tickets (must go through POST /api/tickets)
-- and never allow authenticated users to update privilege columns (role, is_verified, is_adult_verified) on profiles.
grant select, update (rustdesk_id,agent_type,agent_downloaded,consent_accepted,consent_accepted_at,client_name,client_email,client_birth_date,marketing_opt_in,anonymized_at)
  on public.tickets to anon;
grant select, insert (id,ticket_id,sender_role,message) on public.ticket_messages to anon;
grant select on public.profiles to authenticated;
grant update (full_name,specialty,birth_date,terms_accepted_at,terms_version,marketing_opt_in)
  on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select on public.technician_profiles to authenticated;
grant update (availability_status,specialties,accepting_requests,updated_at)
  on public.technician_profiles to authenticated;
grant select, insert, update, delete on public.organization_members, public.client_devices to authenticated;
grant select on public.tickets, public.ticket_messages, public.audit_logs to authenticated;
grant insert (id,ticket_id,sender_role,message,created_at) on public.ticket_messages to authenticated;
grant insert (id,organization_id,actor_type,actor_label,action,target_ref,created_at) on public.audit_logs to authenticated;

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
  return jsonb_build_object('claimed', true, 'ticket', to_jsonb(v_ticket));
end;
$$;
revoke all on function public.claim_ticket_atomically(uuid,uuid) from public, anon, authenticated;
grant execute on function public.claim_ticket_atomically(uuid,uuid) to authenticated;

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
begin
  if auth.uid() is null or p_status is null or p_status not in ('in_progress', 'resolved') then
    return false;
  end if;

  select organization_id, assigned_to, payment_status, status
    into v_org_id, v_assigned_to, v_payment_status, v_current_status
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
      end
  where id = p_ticket_id;

  return found;
end;
$$;
revoke all on function public.update_ticket_as_staff(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.update_ticket_as_staff(uuid, text, text, timestamptz) to authenticated;

create or replace function public.update_own_ticket_as_authenticated(
  p_ticket_id uuid,
  p_rustdesk_id text default null,
  p_agent_type text default null,
  p_consent_accepted boolean default null,
  p_consent_accepted_at timestamptz default null,
  p_agent_downloaded boolean default null,
  p_anonymize boolean default false
)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_uid uuid;
  v_email text;
  v_ticket public.tickets%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then return false; end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then return false; end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if not (
    (v_email <> '' and lower(coalesce(v_ticket.client_email, '')) = v_email)
    or public.is_client_room_authorized(v_ticket.ticket_code, v_ticket.client_session_token)
  ) then
    return false;
  end if;

  if p_anonymize then
    update public.tickets
    set client_name = 'Usuario Anonimizado',
        client_email = 'eliminado@anonimizado.invalid',
        client_birth_date = null,
        rustdesk_id = null,
        marketing_opt_in = false,
        anonymized_at = now()
    where id = p_ticket_id;
    return true;
  end if;

  if p_rustdesk_id is not null and p_rustdesk_id !~ '^[0-9]{9}$' then return false; end if;
  if p_agent_type is not null and p_agent_type not in ('temporary', 'installed') then return false; end if;

  update public.tickets
  set rustdesk_id = coalesce(p_rustdesk_id, rustdesk_id),
      agent_type = coalesce(p_agent_type, agent_type),
      consent_accepted = coalesce(p_consent_accepted, consent_accepted),
      consent_accepted_at = case
        when p_consent_accepted = true then coalesce(p_consent_accepted_at, now())
        when p_consent_accepted = false then null
        else consent_accepted_at
      end,
      agent_downloaded = coalesce(p_agent_downloaded, agent_downloaded)
  where id = p_ticket_id;

  return true;
end;
$$;
revoke all on function public.update_own_ticket_as_authenticated(uuid, text, text, boolean, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.update_own_ticket_as_authenticated(uuid, text, text, boolean, timestamptz, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
