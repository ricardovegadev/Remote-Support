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
  rating numeric(3,2) not null default 5 check (rating between 0 and 5),
  updated_at timestamptz not null default now()
);

alter table public.tickets
  add column if not exists billing_mode text not null default 'one_time',
  add column if not exists subscription_status text not null default 'none',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_subscription_id text,
  add column if not exists client_birth_date date,
  add column if not exists anonymized_at timestamptz;
alter table public.tickets alter column is_adult_verified set default false;

create unique index if not exists idx_tickets_payment_reference
  on public.tickets (payment_reference) where payment_reference is not null;
create unique index if not exists idx_tickets_stripe_subscription_id
  on public.tickets (stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists idx_tickets_organization_id on public.tickets (organization_id);
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
  select auth.uid() is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id = p_org_id and om.user_id = auth.uid() and om.status = 'active'
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id = p_org_id and om.user_id = auth.uid()
      and om.status = 'active' and om.role in ('owner','admin')
  );
$$;

revoke all on function public.request_header(text), public.is_client_room_authorized(text,text),
  public.is_org_member(uuid), public.is_org_admin(uuid) from public, anon, authenticated;
grant execute on function public.request_header(text), public.is_client_room_authorized(text,text) to anon, authenticated;
grant execute on function public.is_org_member(uuid), public.is_org_admin(uuid) to authenticated;

create policy organizations_member_read on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy members_org_read on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));
create policy members_admin_manage on public.organization_members for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy technicians_org_read on public.technician_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));
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
create policy messages_room_read on public.ticket_messages for select to anon, authenticated using (
  exists (select 1 from public.tickets t where t.id = ticket_messages.ticket_id and public.is_client_room_authorized(t.ticket_code,t.client_session_token))
);
create policy messages_room_insert on public.ticket_messages for insert to anon with check (
  sender_role = 'client' and exists (select 1 from public.tickets t where t.id = ticket_messages.ticket_id and public.is_client_room_authorized(t.ticket_code,t.client_session_token))
);
create policy devices_member_read on public.client_devices for select to authenticated using (public.is_org_member(organization_id));
create policy devices_admin_manage on public.client_devices for all to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy audit_member_read on public.audit_logs for select to authenticated using (public.is_org_member(organization_id));

grant select, update (rustdesk_id,agent_type,agent_downloaded,consent_accepted,consent_accepted_at,client_name,client_email,marketing_opt_in,anonymized_at)
  on public.tickets to anon;
grant select, insert (id,ticket_id,sender_role,message) on public.ticket_messages to anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.organization_members, public.client_devices to authenticated;
grant select on public.organizations, public.technician_profiles, public.tickets, public.ticket_messages, public.audit_logs to authenticated;

create or replace function public.claim_ticket_atomically(p_ticket_id uuid, p_tech_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_ticket public.tickets%rowtype; v_member public.organization_members%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_tech_id then return jsonb_build_object('claimed',false,'reason','Autenticación técnica requerida.'); end if;
  select * into v_member from public.organization_members
    where user_id = auth.uid() and status = 'active' and role in ('owner','admin','technician') limit 1;
  if not found then return jsonb_build_object('claimed',false,'reason','Técnico no autorizado.'); end if;
  update public.tickets set assigned_to = auth.uid(), assigned_technician_id = auth.uid(),
    assigned_technician_name = v_member.full_name, assigned_technician_specialty = array_to_string(v_member.specialties,' · '),
    status = 'in_progress', claimed_at = now()
  where id = p_ticket_id and organization_id = v_member.organization_id and assigned_to is null
    and payment_status = 'paid' and status in ('waiting_payment','ready_to_connect') returning * into v_ticket;
  if not found then return jsonb_build_object('claimed',false,'reason','El ticket no está disponible.'); end if;
  return jsonb_build_object('claimed',true,'ticket',to_jsonb(v_ticket));
end;
$$;
revoke all on function public.claim_ticket_atomically(uuid,uuid) from public, anon, authenticated;
grant execute on function public.claim_ticket_atomically(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
