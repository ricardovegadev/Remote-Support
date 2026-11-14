-- ============================================================================
-- Remote Support 365 (Remix Integral) — Esquema SQL Completo para Supabase
-- Incluye: Multiempresa (SaaS), Fuerza Laboral 3 Niveles, AI Workforce 365,
-- Bloqueo Atómico via RPC, Políticas RLS Multiempresa y Supabase Realtime.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Tabla: organizations
-- Entidad raíz multi-tenant (Etapa 1 propia -> Etapa 2 SaaS MSP -> Etapa 3 Red)
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan_tier text not null default 'internal_hq'
    check (plan_tier in ('internal_hq', 'starter_29', 'growth_49', 'scale_79')),
  dispatch_mode text not null default 'smart'
    check (dispatch_mode in ('smart', 'manual', 'round_robin')),
  rustdesk_relay_domain text not null default 'relay.remotesupport365.com',
  payment_gateway text not null default 'stripe_paypal'
    check (payment_gateway in ('stripe', 'paypal', 'stripe_paypal')),
  ai_credits_monthly integer not null default 5000,
  ai_credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Tabla: profiles (compatibilidad con Supabase Auth)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'client'
    check (role in ('client', 'technician', 'admin')),
  specialty text,
  rating numeric(3, 2) not null default 5.00
    check (rating >= 0 and rating <= 5),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Tabla: organization_members
-- Gestión flexible en 3 niveles: internal, freelancer (con tarifa pactada), network
-- ----------------------------------------------------------------------------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  member_type text not null default 'internal'
    check (member_type in ('internal', 'freelancer', 'network')),
  role text not null default 'technician'
    check (role in ('owner', 'admin', 'technician')),
  agreed_ticket_rate_usd numeric(8, 2) not null default 0,
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists idx_org_members_org_type
  on public.organization_members (organization_id, member_type, status);

-- ----------------------------------------------------------------------------
-- 4. Tabla: technician_profiles
-- Estado en tiempo real, especialidades y toggle "Recibir solicitudes"
-- ----------------------------------------------------------------------------
create table if not exists public.technician_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  email text not null unique,
  availability_status text not null default 'available'
    check (availability_status in ('available', 'busy', 'paused', 'offline')),
  specialties text[] not null default array['Windows', 'Redes'],
  accepting_requests boolean not null default true,
  rating numeric(3, 2) not null default 5.00
    check (rating >= 0 and rating <= 5),
  is_verified boolean not null default true,
  active_sessions_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_tech_profiles_availability
  on public.technician_profiles (organization_id, availability_status, accepting_requests);

-- ----------------------------------------------------------------------------
-- 5. Tabla: tickets
-- Solicitudes de soporte con diagnóstico IA, ID RustDesk, agente y asignación atómica
-- ----------------------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique, -- Ej: RS-1027
  organization_id uuid references public.organizations(id) on delete set null,
  client_name text not null,
  client_email text not null,
  category text not null default 'Otro'
    check (category in ('Impresoras', 'Correo/Office', 'Sistema Operativo/Lentitud', 'Redes/Wi-Fi', 'Otro')),
  os_type text not null
    check (os_type in ('Windows', 'Mac')),
  service_tier text not null default 'Express $25'
    check (service_tier in ('Express $25', 'Optimización $40', 'Avanzado $55')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  problem_description text not null,
  ai_diagnosis jsonb not null default '{}'::jsonb,
  ai_diagnosis_summary text,
  rustdesk_id text
    check (rustdesk_id is null or rustdesk_id ~ '^[0-9]{9}$'),
  agent_type text not null default 'temporary'
    check (agent_type in ('temporary', 'installed')),
  agent_downloaded boolean not null default false,
  consent_accepted boolean not null default false,
  consent_accepted_at timestamptz,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'refunded')),
  status text not null default 'waiting_payment'
    check (status in ('waiting_payment', 'ready_to_connect', 'in_progress', 'resolved')),
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_technician_id uuid references auth.users(id) on delete set null,
  assigned_technician_name text,
  assigned_technician_specialty text,
  resolution_notes text,
  client_session_token text not null default encode(gen_random_bytes(24), 'hex'),
  claimed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tickets_org_status_created
  on public.tickets (organization_id, status, created_at desc);

create index if not exists idx_tickets_code_token
  on public.tickets (ticket_code, client_session_token);

create index if not exists idx_tickets_assigned_to
  on public.tickets (assigned_to)
  where assigned_to is not null;

-- ----------------------------------------------------------------------------
-- 6. Tabla: ticket_messages
-- Chat en tiempo real cliente <-> técnico <-> sistema
-- ----------------------------------------------------------------------------
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_role text not null
    check (sender_role in ('client', 'technician', 'system')),
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_messages_ticket_created
  on public.ticket_messages (ticket_id, created_at asc);

-- ----------------------------------------------------------------------------
-- 7. Tabla: client_devices
-- Equipos Pyme con Agente Instalado desatendido
-- ----------------------------------------------------------------------------
create table if not exists public.client_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  device_name text not null,
  os_type text not null check (os_type in ('Windows', 'Mac')),
  rustdesk_id text not null check (rustdesk_id ~ '^[0-9]{9}$'),
  agent_type text not null default 'installed' check (agent_type in ('temporary', 'installed')),
  plan_name text not null default 'Plan Pyme $149/mes',
  is_online boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. Tabla: remote_sessions
-- Auditoría e historial de sesiones remotas
-- ----------------------------------------------------------------------------
create table if not exists public.remote_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  technician_id uuid references auth.users(id) on delete set null,
  rustdesk_id text not null,
  agent_type text not null default 'temporary' check (agent_type in ('temporary', 'installed')),
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer
);

-- ----------------------------------------------------------------------------
-- 9. Tabla: ai_agents_config
-- Gobernanza y activación de los 6 agentes digitales de AI Workforce 365
-- ----------------------------------------------------------------------------
create table if not exists public.ai_agents_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_key text not null
    check (agent_key in (
      'ai_receptionist',
      'ai_dispatcher',
      'ai_technician_assistant',
      'ai_follow_up',
      'ai_report_generator',
      'ai_operations_manager'
    )),
  agent_name text not null,
  role_description text not null,
  is_enabled boolean not null default true,
  governance_rules jsonb not null default '[]'::jsonb,
  credits_used integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_key)
);

-- ----------------------------------------------------------------------------
-- 10. Tabla: audit_logs
-- Registro inmutable de seguridad, consentimientos y acciones de agentes IA
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_type text not null check (actor_type in ('technician', 'ai_agent', 'client', 'system')),
  actor_label text not null,
  action text not null,
  target_ref text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 11. Función RPC Atómica: claim_ticket_atomically(p_ticket_id, p_tech_id)
-- Garantiza bloqueo atómico sin colisiones (solo el primer técnico reclama).
-- ----------------------------------------------------------------------------
create or replace function public.claim_ticket_atomically(
  p_ticket_id uuid,
  p_tech_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_tech_name text;
  v_tech_specialty text;
begin
  select
    coalesce(tp.full_name, p.full_name, 'Técnico Asignado'),
    coalesce(array_to_string(tp.specialties, ' · '), p.specialty, 'Especialista Verificado')
  into v_tech_name, v_tech_specialty
  from public.profiles p
  left join public.technician_profiles tp on tp.user_id = p.id
  where p.id = p_tech_id;

  update public.tickets
  set
    assigned_to = p_tech_id,
    assigned_technician_id = p_tech_id,
    assigned_technician_name = coalesce(v_tech_name, 'Técnico Asignado'),
    assigned_technician_specialty = coalesce(v_tech_specialty, 'Especialista Verificado'),
    status = case
      when status = 'waiting_payment' and rustdesk_id is not null then 'in_progress'
      when status = 'ready_to_connect' then 'in_progress'
      else 'in_progress'
    end,
    claimed_at = now()
  where id = p_ticket_id
    and assigned_to is null
    and status in ('waiting_payment', 'ready_to_connect')
  returning * into v_ticket;

  if not found then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'El ticket ya fue asignado a otro técnico o no está disponible para despacho.'
    );
  end if;

  insert into public.audit_logs (organization_id, actor_type, actor_label, action, target_ref)
  values (
    v_ticket.organization_id,
    'technician',
    coalesce(v_tech_name, p_tech_id::text),
    'Asignación atómica de ticket (claim_ticket_atomically)',
    v_ticket.ticket_code
  );

  return jsonb_build_object(
    'claimed', true,
    'ticket', to_jsonb(v_ticket)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 12. Funciones auxiliares de autorización RLS Multiempresa
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  ) or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.request_header(header_name text)
returns text
language plpgsql
stable
as $$
declare
  headers_raw text;
begin
  headers_raw := nullif(current_setting('request.headers', true), '');
  if headers_raw is null then
    return null;
  end if;
  return headers_raw::jsonb ->> lower(header_name);
exception
  when others then
    return null;
end;
$$;

create or replace function public.is_client_room_authorized(row_ticket_code text, row_token text)
returns boolean
language sql
stable
as $$
  select
    row_ticket_code is not null
    and row_token is not null
    and row_ticket_code = public.request_header('x-ticket-code')
    and row_token = public.request_header('x-ticket-token');
$$;

-- ----------------------------------------------------------------------------
-- 13. Políticas Row Level Security (RLS) Multiempresa
-- ----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.technician_profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.client_devices enable row level security;
alter table public.remote_sessions enable row level security;
alter table public.ai_agents_config enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "orgs_select_members" on public.organizations;
create policy "orgs_select_members" on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists "org_members_org_scoped" on public.organization_members;
create policy "org_members_org_scoped" on public.organization_members
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "tech_profiles_org_scoped" on public.technician_profiles;
create policy "tech_profiles_org_scoped" on public.technician_profiles
  for all using (user_id = auth.uid() or public.is_org_member(organization_id))
  with check (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists "tickets_org_member_all" on public.tickets;
create policy "tickets_org_member_all" on public.tickets
  for all using (organization_id is null or public.is_org_member(organization_id))
  with check (organization_id is null or public.is_org_member(organization_id));

drop policy if exists "tickets_insert_public" on public.tickets;
create policy "tickets_insert_public" on public.tickets
  for insert with check (
    char_length(trim(ticket_code)) >= 5
    and char_length(trim(client_email)) >= 5
    and char_length(trim(client_session_token)) >= 16
  );

drop policy if exists "tickets_select_client_room" on public.tickets;
create policy "tickets_select_client_room" on public.tickets
  for select using (public.is_client_room_authorized(ticket_code, client_session_token));

drop policy if exists "tickets_update_client_room" on public.tickets;
create policy "tickets_update_client_room" on public.tickets
  for update
  using (public.is_client_room_authorized(ticket_code, client_session_token))
  with check (public.is_client_room_authorized(ticket_code, client_session_token));

drop policy if exists "ticket_messages_org_member_all" on public.ticket_messages;
create policy "ticket_messages_org_member_all" on public.ticket_messages
  for all using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and (t.organization_id is null or public.is_org_member(t.organization_id))
    )
  );

drop policy if exists "ticket_messages_client_room_select" on public.ticket_messages;
create policy "ticket_messages_client_room_select" on public.ticket_messages
  for select using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and public.is_client_room_authorized(t.ticket_code, t.client_session_token)
    )
  );

drop policy if exists "ticket_messages_client_room_insert" on public.ticket_messages;
create policy "ticket_messages_client_room_insert" on public.ticket_messages
  for insert with check (
    sender_role = 'client'
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and public.is_client_room_authorized(t.ticket_code, t.client_session_token)
    )
  );

drop policy if exists "client_devices_org_scoped" on public.client_devices;
create policy "client_devices_org_scoped" on public.client_devices
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "remote_sessions_org_scoped" on public.remote_sessions;
create policy "remote_sessions_org_scoped" on public.remote_sessions
  for all using (organization_id is null or public.is_org_member(organization_id))
  with check (organization_id is null or public.is_org_member(organization_id));

drop policy if exists "ai_agents_config_org_scoped" on public.ai_agents_config;
create policy "ai_agents_config_org_scoped" on public.ai_agents_config
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "audit_logs_org_scoped" on public.audit_logs;
create policy "audit_logs_org_scoped" on public.audit_logs
  for select using (organization_id is null or public.is_org_member(organization_id));

drop policy if exists "audit_logs_insert_org_member" on public.audit_logs;
create policy "audit_logs_insert_org_member" on public.audit_logs
  for insert with check (organization_id is null or public.is_org_member(organization_id));

drop policy if exists "audit_logs_insert_client_room" on public.audit_logs;
create policy "audit_logs_insert_client_room" on public.audit_logs
  for insert with check (
    actor_type in ('client', 'ai_agent')
    and exists (
      select 1 from public.tickets t
      where t.ticket_code = audit_logs.target_ref
        and (
          public.is_client_room_authorized(t.ticket_code, t.client_session_token)
          or t.created_at > now() - interval '5 minutes'
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 14. Publicación Supabase Realtime
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table public.tickets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ticket_messages'
  ) then
    alter publication supabase_realtime add table public.ticket_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'technician_profiles'
  ) then
    alter publication supabase_realtime add table public.technician_profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_agents_config'
  ) then
    alter publication supabase_realtime add table public.ai_agents_config;
  end if;
end $$;
