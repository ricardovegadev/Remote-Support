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
  subscription_auto_renew boolean not null default true,
  subscription_canceled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Organización pública de operación. Los tickets del portal público se asignan
-- aquí; las organizaciones de clientes MSP se crean por separado.
insert into public.organizations (id, name, slug, plan_tier)
values (
  '00000000-0000-4000-8000-000000000001',
  'Remote Support 365',
  'remote-support-365',
  'internal_hq'
)
on conflict (id) do nothing;

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
  birth_date date,
  is_adult_verified boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  marketing_opt_in boolean not null default false,
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
  specialties text[] not null default array['Windows & BSOD', 'Redes & VPN'],
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
  organization_name text,
  client_name text not null,
  client_email text not null,
  category text not null default 'Otro'
    check (category in (
      'Windows lento o bajo rendimiento',
      'Aplicaciones que no arrancan',
      'Pantallazos azules (BSOD)',
      'Problemas de Wi-Fi o red',
      'Errores de Microsoft 365 y Outlook',
      'Configuración de impresoras',
      'Eliminación de malware y virus',
      'Recuperación de archivos',
      'Actualizaciones de Windows',
      'VPN y acceso remoto',
      'Impresoras',
      'Correo/Office',
      'Sistema Operativo/Lentitud',
      'Redes/Wi-Fi',
      'Otro'
    )),
  os_type text not null
    check (os_type in ('Windows', 'Mac', 'Linux', 'Mobile')),
  service_tier text not null default 'Express $15'
    check (service_tier in ('Express $15', 'Optimización $29', 'Avanzado $39', 'Pyme Esencial $39/mes', 'Pyme Corporativo $79/mes')),
  billing_mode text not null default 'one_time'
    check (billing_mode in ('one_time', 'pyme_monthly')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  problem_description text not null,
  ai_diagnosis jsonb not null default '{}'::jsonb,
  ai_diagnosis_summary text,
  human_reviewed_at timestamptz,
  human_reviewed_by text,
  client_birth_date date,
  is_adult_verified boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  marketing_opt_in boolean not null default false,
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'active', 'past_due', 'canceled')),
  anonymized_at timestamptz,
  rustdesk_id text
    check (rustdesk_id is null or rustdesk_id ~ '^[0-9]{9}$'),
  agent_type text not null default 'temporary'
    check (agent_type in ('temporary', 'installed')),
  agent_downloaded boolean not null default false,
  consent_accepted boolean not null default false,
  consent_accepted_at timestamptz,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'refunded')),
  payment_reference text,
  paid_at timestamptz,
  stripe_subscription_id text,
  status text not null default 'waiting_payment'
    check (status in ('waiting_payment', 'ready_to_connect', 'in_progress', 'resolved')),
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_technician_id uuid references auth.users(id) on delete set null,
  assigned_technician_name text,
  assigned_technician_specialty text,
  resolution_notes text,
  client_session_token text not null default encode(gen_random_bytes(32), 'hex'),
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
  os_type text not null check (os_type in ('Windows', 'Mac', 'Linux', 'Mobile')),
  rustdesk_id text not null check (rustdesk_id ~ '^[0-9]{9}$'),
  agent_type text not null default 'installed' check (agent_type in ('temporary', 'installed')),
  service_tier text not null default 'Pyme Corporativo $79/mes'
    check (service_tier in ('Express $15', 'Optimización $29', 'Avanzado $39', 'Pyme Esencial $39/mes', 'Pyme Corporativo $79/mes')),
  plan_name text not null default 'Pyme Corporativo $79/mes',
  is_online boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Migración idempotente para bases ya provisionadas (actualiza constraints y columnas nuevas)
do $$
begin
  alter table public.tickets add column if not exists organization_name text;
  alter table public.tickets add column if not exists billing_mode text not null default 'one_time';
  alter table public.tickets add column if not exists subscription_status text not null default 'none';
  alter table public.tickets add column if not exists payment_reference text;
  alter table public.tickets add column if not exists paid_at timestamptz;
  alter table public.tickets add column if not exists stripe_subscription_id text;
  alter table public.tickets add column if not exists ai_diagnosis jsonb not null default '{}'::jsonb;
  alter table public.tickets add column if not exists ai_diagnosis_summary text;
  alter table public.tickets add column if not exists human_reviewed_at timestamptz;
  alter table public.tickets add column if not exists human_reviewed_by text;
  alter table public.tickets add column if not exists client_birth_date date;
  alter table public.tickets add column if not exists is_adult_verified boolean not null default false;
  alter table public.tickets alter column is_adult_verified set default false;
  alter table public.tickets add column if not exists terms_accepted_at timestamptz;
  alter table public.tickets add column if not exists terms_version text;
  alter table public.tickets add column if not exists marketing_opt_in boolean not null default false;
  alter table public.tickets add column if not exists anonymized_at timestamptz;
  alter table public.tickets add column if not exists consent_accepted_at timestamptz;
  alter table public.tickets add column if not exists assigned_technician_id uuid references auth.users(id) on delete set null;
  alter table public.tickets add column if not exists assigned_technician_name text;
  alter table public.tickets add column if not exists assigned_technician_specialty text;
  alter table public.tickets add column if not exists claimed_at timestamptz;
  alter table public.tickets add column if not exists resolved_at timestamptz;

  alter table public.tickets alter column service_tier set default 'Express $15';
  alter table public.tickets drop constraint if exists tickets_category_check;
  alter table public.tickets
    add constraint tickets_category_check
    check (category in (
      'Windows lento o bajo rendimiento',
      'Aplicaciones que no arrancan',
      'Pantallazos azules (BSOD)',
      'Problemas de Wi-Fi o red',
      'Errores de Microsoft 365 y Outlook',
      'Configuración de impresoras',
      'Eliminación de malware y virus',
      'Recuperación de archivos',
      'Actualizaciones de Windows',
      'VPN y acceso remoto',
      'Impresoras',
      'Correo/Office',
      'Sistema Operativo/Lentitud',
      'Redes/Wi-Fi',
      'Otro'
    ));

  alter table public.tickets drop constraint if exists tickets_os_type_check;
  alter table public.tickets
    add constraint tickets_os_type_check
    check (os_type in ('Windows', 'Mac', 'Linux', 'Mobile'));

  alter table public.tickets drop constraint if exists tickets_service_tier_check;
  alter table public.tickets
    add constraint tickets_service_tier_check
    check (service_tier in ('Express $15', 'Optimización $29', 'Avanzado $39', 'Pyme Esencial $39/mes', 'Pyme Corporativo $79/mes'));

  alter table public.tickets drop constraint if exists tickets_billing_mode_check;
  alter table public.tickets
    add constraint tickets_billing_mode_check
    check (billing_mode in ('one_time', 'pyme_monthly'));

  alter table public.tickets drop constraint if exists tickets_subscription_status_check;
  alter table public.tickets
    add constraint tickets_subscription_status_check
    check (subscription_status in ('none', 'active', 'past_due', 'canceled'));

  alter table public.client_devices
    add column if not exists service_tier text not null default 'Pyme Corporativo $79/mes';
  alter table public.client_devices alter column plan_name set default 'Pyme Corporativo $79/mes';
  alter table public.client_devices drop constraint if exists client_devices_os_type_check;
  alter table public.client_devices
    add constraint client_devices_os_type_check
    check (os_type in ('Windows', 'Mac', 'Linux', 'Mobile'));

  alter table public.client_devices drop constraint if exists client_devices_service_tier_check;
  alter table public.client_devices
    add constraint client_devices_service_tier_check
    check (service_tier in ('Express $15', 'Optimización $29', 'Avanzado $39', 'Pyme Esencial $39/mes', 'Pyme Corporativo $79/mes'));
end $$;

create unique index if not exists idx_tickets_payment_reference
  on public.tickets (payment_reference)
  where payment_reference is not null;
create unique index if not exists idx_tickets_stripe_subscription_id
  on public.tickets (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ----------------------------------------------------------------------------
-- 8. Tabla: remote_sessions
-- Auditoría e historial de sesiones remotas
-- ----------------------------------------------------------------------------
create table if not exists public.remote_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  ticket_code text,
  client_name text,
  technician_id uuid references auth.users(id) on delete set null,
  technician_name text,
  rustdesk_id text not null,
  agent_type text not null default 'temporary' check (agent_type in ('temporary', 'installed')),
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer
);

alter table public.remote_sessions add column if not exists ticket_code text;
alter table public.remote_sessions add column if not exists client_name text;
alter table public.remote_sessions add column if not exists technician_name text;

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
-- 10b. Tabla: enterprise_leads
-- Solicitudes comerciales Pyme / MSP / SaaS desde la landing pública
-- ----------------------------------------------------------------------------
create table if not exists public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_email text not null,
  team_size text not null,
  plan_interest text,
  created_at timestamptz not null default now()
);

create or replace function public.audit_ticket_security_changes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.terms_accepted_at is not null then
      insert into public.audit_logs (organization_id, actor_type, actor_label, action, target_ref)
      values (
        new.organization_id,
        'client',
        new.client_name,
        'Declaró mayoría de edad y aceptó términos ' || coalesce(new.terms_version, 'sin versión'),
        new.ticket_code
      );
    end if;
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status
     and new.payment_status = 'paid' then
    insert into public.audit_logs (organization_id, actor_type, actor_label, action, target_ref)
    values (new.organization_id, 'system', 'Verificación de pagos', 'Pago confirmado por el servidor', new.ticket_code);
  end if;

  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    insert into public.audit_logs (organization_id, actor_type, actor_label, action, target_ref)
    values (
      new.organization_id,
      'technician',
      coalesce(new.assigned_technician_name, new.assigned_to::text),
      'Ticket asignado a técnico autorizado',
      new.ticket_code
    );
  end if;

  if new.status is distinct from old.status then
    insert into public.audit_logs (organization_id, actor_type, actor_label, action, target_ref)
    values (
      new.organization_id,
      'system',
      'Flujo de tickets',
      'Estado de ticket actualizado a ' || new.status,
      new.ticket_code
    );
  end if;

  if new.consent_accepted is distinct from old.consent_accepted and new.consent_accepted then
    insert into public.audit_logs (organization_id, actor_type, actor_label, action, target_ref)
    values (new.organization_id, 'client', new.client_name, 'Aceptó el consentimiento de acceso remoto', new.ticket_code);
  end if;

  if old.anonymized_at is null and new.anonymized_at is not null then
    insert into public.audit_logs (organization_id, actor_type, actor_label, action, target_ref)
    values (new.organization_id, 'client', 'Titular de datos', 'Solicitó anonimización de los datos del ticket', new.ticket_code);
  end if;

  return new;
end;
$$;
revoke all on function public.audit_ticket_security_changes() from public, anon, authenticated;
drop trigger if exists audit_ticket_security_changes on public.tickets;
create trigger audit_ticket_security_changes
  after insert or update on public.tickets
  for each row execute function public.audit_ticket_security_changes();

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
set search_path = pg_catalog, public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_tech_name text;
  v_tech_specialty text;
  v_specialties text[];
  v_caller_id uuid := auth.uid();
  v_target_os text;
begin
  if v_caller_id is null or v_caller_id <> p_tech_id then
    return jsonb_build_object('claimed', false, 'reason', 'Autenticación técnica requerida.');
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.user_id = v_caller_id
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'technician')
  ) then
    return jsonb_build_object('claimed', false, 'reason', 'El usuario no pertenece a una organización activa.');
  end if;

  select
    coalesce(tp.full_name, p.full_name, 'Técnico Asignado'),
    coalesce(array_to_string(tp.specialties, ' · '), p.specialty, 'Especialista Verificado'),
    coalesce(tp.specialties, '{}'::text[])
  into v_tech_name, v_tech_specialty, v_specialties
  from public.profiles p
  left join public.technician_profiles tp on tp.user_id = p.id
  where p.id = p_tech_id;

  select os_type into v_target_os
  from public.tickets
  where id = p_ticket_id;

  if v_target_os = 'Mac' and coalesce(array_length(v_specialties, 1), 0) > 0 and not ('Soporte macOS' = any(v_specialties)) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'Este ticket requiere un técnico con especialidad en Soporte macOS.'
    );
  end if;

  if v_target_os = 'Linux' and coalesce(array_length(v_specialties, 1), 0) > 0 and not ('Soporte Linux & Servidores' = any(v_specialties)) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'Este ticket requiere un técnico con especialidad en Soporte Linux & Servidores.'
    );
  end if;

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
    and payment_status = 'paid'
    and status in ('waiting_payment', 'ready_to_connect')
    and exists (
      select 1
      from public.organization_members om
      where om.user_id = v_caller_id
        and om.organization_id = tickets.organization_id
        and om.status = 'active'
        and om.role in ('owner', 'admin', 'technician')
    )
  returning * into v_ticket;

  if not found then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'El ticket ya fue asignado a otro técnico o no está disponible para despacho.'
    );
  end if;

  return jsonb_build_object(
    'claimed', true,
    'ticket', to_jsonb(v_ticket)
  );
end;
$$;

revoke all on function public.claim_ticket_atomically(uuid, uuid) from public, anon;
grant execute on function public.claim_ticket_atomically(uuid, uuid) to authenticated;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
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

revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin')
  ) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;

create or replace function public.mark_ticket_human_reviewed(
  p_ticket_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_reviewer_name text;
  v_reviewed_at timestamptz := now();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'Autenticación requerida.');
  end if;

  select organization_id into v_org_id
  from public.tickets
  where id = p_ticket_id
  for update;

  if not found or v_org_id is null or not public.is_org_member(v_org_id) then
    return jsonb_build_object('ok', false, 'reason', 'No autorizado para revisar este ticket.');
  end if;

  select coalesce(tp.full_name, p.full_name, 'Especialista')
    into v_reviewer_name
  from public.profiles p
  left join public.technician_profiles tp on tp.user_id = p.id
  where p.id = v_uid
  limit 1;

  v_reviewer_name := coalesce(nullif(trim(v_reviewer_name), ''), 'Especialista');

  update public.tickets
  set
    human_reviewed_at = v_reviewed_at,
    human_reviewed_by = v_reviewer_name
  where id = p_ticket_id;

  return jsonb_build_object(
    'ok', true,
    'human_reviewed_at', v_reviewed_at,
    'human_reviewed_by', v_reviewer_name
  );
end;
$$;
revoke all on function public.mark_ticket_human_reviewed(uuid) from public, anon;
grant execute on function public.mark_ticket_human_reviewed(uuid) to authenticated;

create or replace function public.update_ticket_as_staff(
  p_ticket_id uuid,
  p_status text,
  p_resolution_notes text default null,
  p_resolved_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_assigned_to uuid;
  v_payment_status text;
  v_current_status text;
  v_reviewer_name text;
begin
  if v_uid is null or p_status is null or p_status not in ('in_progress', 'resolved') then
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
  if v_assigned_to is distinct from v_uid
     and not public.is_org_admin(v_org_id) then
    return false;
  end if;
  if p_status = 'resolved' and v_current_status <> 'in_progress' then
    return false;
  end if;
  if p_status = 'in_progress'
     and v_current_status not in ('ready_to_connect', 'in_progress', 'resolved') then
    return false;
  end if;
  if p_status = 'resolved' and p_resolved_at is null then
    return false;
  end if;
  if p_resolution_notes is not null and char_length(p_resolution_notes) > 5000 then
    return false;
  end if;

  select coalesce(tp.full_name, p.full_name, 'Especialista')
    into v_reviewer_name
  from public.profiles p
  left join public.technician_profiles tp on tp.user_id = p.id
  where p.id = v_uid
  limit 1;

  update public.tickets
  set status = p_status,
      resolution_notes = coalesce(p_resolution_notes, resolution_notes),
      resolved_at = case
        when p_status = 'in_progress' then null
        else coalesce(p_resolved_at, now())
      end,
      human_reviewed_at = case
        when p_status = 'resolved' then coalesce(human_reviewed_at, now())
        else human_reviewed_at
      end,
      human_reviewed_by = case
        when p_status = 'resolved' then coalesce(human_reviewed_by, nullif(trim(v_reviewer_name), ''), 'Especialista')
        else human_reviewed_by
      end
  where id = p_ticket_id;

  return found;
end;
$$;
revoke all on function public.update_ticket_as_staff(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.update_ticket_as_staff(uuid, text, text, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- 12. Funciones auxiliares de autorización RLS Multiempresa
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
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
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'client', -- authorization roles are assigned by trusted operators only
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    coalesce((new.raw_user_meta_data ->> 'is_adult_verified')::boolean, false),
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'terms_version', ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false)
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
set search_path = pg_catalog, public
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

revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;

create or replace function public.request_header(header_name text)
returns text
language plpgsql
stable
set search_path = pg_catalog, public
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
set search_path = pg_catalog, public
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
alter table public.enterprise_leads enable row level security;

-- Remove legacy permissive policies before installing the reviewed policy set.
-- Old deployments used localized policy names which a list of known names missed.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'organizations', 'profiles', 'organization_members', 'technician_profiles',
        'tickets', 'ticket_messages', 'client_devices', 'remote_sessions',
        'ai_agents_config', 'audit_logs'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Revoke inherited/default API access; explicit grants below form the allowlist.
revoke all on public.organizations, public.profiles, public.organization_members,
  public.technician_profiles, public.tickets, public.ticket_messages,
  public.client_devices, public.remote_sessions, public.ai_agents_config,
  public.audit_logs from public, anon, authenticated;

drop policy if exists "orgs_select_members" on public.organizations;
create policy "orgs_select_members" on public.organizations
  for select to authenticated using (public.is_org_member(id));
grant select, update on public.organizations to authenticated;

drop policy if exists "profiles_self_select_update" on public.profiles;
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_authenticated_select_self" on public.profiles;
create policy "profiles_authenticated_select_self" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_authenticated_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, specialty, birth_date, terms_accepted_at, terms_version, marketing_opt_in)
  on public.profiles to authenticated;

drop policy if exists "org_members_org_scoped" on public.organization_members;
drop policy if exists "org_members_select_scoped" on public.organization_members;
drop policy if exists "org_members_manage_admins" on public.organization_members;
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin')
  ) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;
revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;
drop policy if exists "orgs_update_members" on public.organizations;
drop policy if exists "orgs_update_admins" on public.organizations;
create policy "orgs_update_admins" on public.organizations
  for update to authenticated using (public.is_org_admin(id))
  with check (public.is_org_admin(id));
create policy "org_members_select_scoped" on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));
create policy "org_members_manage_admins" on public.organization_members
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
grant select, insert, update, delete on public.organization_members to authenticated;

drop policy if exists "tech_profiles_org_scoped" on public.technician_profiles;
drop policy if exists "tech_profiles_select_scoped" on public.technician_profiles;
drop policy if exists "tech_profiles_update_scoped" on public.technician_profiles;
create policy "tech_profiles_select_scoped" on public.technician_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_org_member(organization_id));
create policy "tech_profiles_update_scoped" on public.technician_profiles
  for update to authenticated
  using (
    (user_id = (select auth.uid()) and public.is_org_member(organization_id))
    or public.is_org_admin(organization_id)
  )
  with check (
    (user_id = (select auth.uid()) and public.is_org_member(organization_id))
    or public.is_org_admin(organization_id)
  );
revoke insert, update, delete on public.technician_profiles from anon, authenticated;
grant select on public.technician_profiles to authenticated;
grant update (availability_status, specialties, accepting_requests, updated_at)
  on public.technician_profiles to authenticated;

drop policy if exists "tickets_org_member_all" on public.tickets;
drop policy if exists "tickets_select_org_members" on public.tickets;
create policy "tickets_select_org_members" on public.tickets
  for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));

drop policy if exists "tickets_update_assigned_staff" on public.tickets;

-- Public ticket creation must go through POST /api/tickets (server-side age/tier/rate-limit enforcement).
drop policy if exists "tickets_insert_public" on public.tickets;

drop policy if exists "tickets_insert_org_member" on public.tickets;
create policy "tickets_insert_org_member" on public.tickets
  for insert to authenticated with check (
    organization_id is not null
    and public.is_org_member(organization_id)
    and ticket_code ~* '^RS-[A-Z0-9]{4,12}$'
    and char_length(trim(client_email)) >= 5
    and client_session_token ~ '^[A-Fa-f0-9]{64}$'
    and payment_status = 'pending'
    and status = 'waiting_payment'
    and assigned_to is null
    and assigned_technician_id is null
    and consent_accepted = false
  );

drop policy if exists "tickets_select_client_room" on public.tickets;
create policy "tickets_select_client_room" on public.tickets
  for select to anon, authenticated
  using (public.is_client_room_authorized(ticket_code, client_session_token));

drop policy if exists "tickets_update_client_room" on public.tickets;
create policy "tickets_update_client_room" on public.tickets
  for update to anon, authenticated
  using (public.is_client_room_authorized(ticket_code, client_session_token))
  with check (
    public.is_client_room_authorized(ticket_code, client_session_token)
    and payment_status in ('pending', 'paid')
    and status in ('waiting_payment', 'ready_to_connect', 'in_progress')
  );

drop policy if exists "tickets_client_room_privacy_update" on public.tickets;
create policy "tickets_client_room_privacy_update" on public.tickets
  for update to anon, authenticated
  using (public.is_client_room_authorized(ticket_code, client_session_token))
  with check (
    public.is_client_room_authorized(ticket_code, client_session_token)
    and anonymized_at is not null
  );

-- La app pública crea tickets a través de POST /api/tickets (service_role) y solo puede actualizar
-- los campos que el cliente necesita durante la sala. Un pago nunca se confirma desde el navegador.
revoke insert, update, delete on public.tickets from anon, authenticated;
grant insert (
  id, ticket_code, organization_id, organization_name, category, client_name,
  client_email, client_birth_date, is_adult_verified, terms_accepted_at,
  terms_version, marketing_opt_in, billing_mode, os_type,
  service_tier, priority, problem_description, ai_diagnosis, ai_diagnosis_summary,
  client_session_token, created_at
) on public.tickets to authenticated;
grant select on public.tickets to anon, authenticated;
grant update (
  rustdesk_id, agent_type, consent_accepted, consent_accepted_at,
  agent_downloaded, client_name, client_email, client_birth_date,
  marketing_opt_in, anonymized_at
)
  on public.tickets to anon;
revoke update on public.tickets from authenticated;
alter table public.tickets alter column is_adult_verified set default false;

-- RPC controlada SECURITY DEFINER para que un usuario autenticado actualice o anonimice
-- únicamente sus propios tickets sin otorgar UPDATE directo sobre columnas sensibles (pago/estado).
create or replace function public.update_own_ticket_as_authenticated(
  p_ticket_id uuid,
  p_rustdesk_id text default null,
  p_agent_type text default null,
  p_consent_accepted boolean default null,
  p_consent_accepted_at timestamptz default null,
  p_agent_downloaded boolean default null,
  p_anonymize boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_email text;
  v_ticket public.tickets%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  select * into v_ticket
  from public.tickets
  where id = p_ticket_id
  for update;

  if not found then
    return false;
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if not (
    (v_email <> '' and lower(coalesce(v_ticket.client_email, '')) = v_email)
    or public.is_client_room_authorized(v_ticket.ticket_code, v_ticket.client_session_token)
  ) then
    return false;
  end if;

  if p_anonymize then
    update public.tickets
    set
      client_name = 'Usuario Anonimizado',
      client_email = 'eliminado@anonimizado.invalid',
      client_birth_date = null,
      rustdesk_id = null,
      marketing_opt_in = false,
      anonymized_at = now()
    where id = p_ticket_id;
    return true;
  end if;

  if p_rustdesk_id is not null and p_rustdesk_id !~ '^[0-9]{9}$' then
    return false;
  end if;

  if p_agent_type is not null and p_agent_type not in ('temporary', 'installed') then
    return false;
  end if;

  update public.tickets
  set
    rustdesk_id = coalesce(p_rustdesk_id, rustdesk_id),
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

drop policy if exists "ticket_messages_org_member_all" on public.ticket_messages;
drop policy if exists "ticket_messages_org_member_select" on public.ticket_messages;
drop policy if exists "ticket_messages_org_member_insert" on public.ticket_messages;
create policy "ticket_messages_org_member_select" on public.ticket_messages
  for select to authenticated using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and t.organization_id is not null
        and public.is_org_member(t.organization_id)
    )
  );
create policy "ticket_messages_org_member_insert" on public.ticket_messages
  for insert to authenticated with check (
    sender_role = 'technician'
    and
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and t.organization_id is not null
        and public.is_org_member(t.organization_id)
    )
  );

drop policy if exists "ticket_messages_client_room_select" on public.ticket_messages;
create policy "ticket_messages_client_room_select" on public.ticket_messages
  for select to anon, authenticated using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and public.is_client_room_authorized(t.ticket_code, t.client_session_token)
    )
  );

drop policy if exists "ticket_messages_client_room_insert" on public.ticket_messages;
create policy "ticket_messages_client_room_insert" on public.ticket_messages
  for insert to anon, authenticated with check (
    sender_role = 'client'
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and public.is_client_room_authorized(t.ticket_code, t.client_session_token)
    )
  );
revoke all on public.ticket_messages from public, anon, authenticated;
grant select on public.ticket_messages to anon;
grant insert (id, ticket_id, sender_role, message) on public.ticket_messages to anon;
grant select on public.ticket_messages to authenticated;
grant insert (id, ticket_id, sender_role, message, created_at) on public.ticket_messages to authenticated;

drop policy if exists "client_devices_org_scoped" on public.client_devices;
drop policy if exists "client_devices_select_members" on public.client_devices;
drop policy if exists "client_devices_insert_members" on public.client_devices;
drop policy if exists "client_devices_update_members" on public.client_devices;
drop policy if exists "client_devices_manage_admins" on public.client_devices;
create policy "client_devices_select_members" on public.client_devices
  for select to authenticated using (public.is_org_member(organization_id));
create policy "client_devices_insert_members" on public.client_devices
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "client_devices_update_members" on public.client_devices
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "client_devices_manage_admins" on public.client_devices
  for delete to authenticated using (public.is_org_admin(organization_id));
revoke all on public.client_devices from public, anon, authenticated;
grant select, insert, update, delete on public.client_devices to authenticated;

drop policy if exists "remote_sessions_org_scoped" on public.remote_sessions;
drop policy if exists "remote_sessions_select_members" on public.remote_sessions;
drop policy if exists "remote_sessions_insert_members" on public.remote_sessions;
drop policy if exists "remote_sessions_update_members" on public.remote_sessions;
drop policy if exists "remote_sessions_manage_admins" on public.remote_sessions;
create policy "remote_sessions_select_members" on public.remote_sessions
  for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));
create policy "remote_sessions_insert_members" on public.remote_sessions
  for insert to authenticated
  with check (organization_id is not null and public.is_org_member(organization_id));
create policy "remote_sessions_update_members" on public.remote_sessions
  for update to authenticated
  using (organization_id is not null and public.is_org_member(organization_id))
  with check (organization_id is not null and public.is_org_member(organization_id));
create policy "remote_sessions_manage_admins" on public.remote_sessions
  for delete to authenticated using (public.is_org_admin(organization_id));
revoke all on public.remote_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.remote_sessions to authenticated;

drop policy if exists "ai_agents_config_org_scoped" on public.ai_agents_config;
drop policy if exists "ai_agents_config_select_members" on public.ai_agents_config;
drop policy if exists "ai_agents_config_manage_admins" on public.ai_agents_config;
create policy "ai_agents_config_select_members" on public.ai_agents_config
  for select to authenticated using (public.is_org_member(organization_id));
create policy "ai_agents_config_manage_admins" on public.ai_agents_config
  for all to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
revoke all on public.ai_agents_config from public, anon, authenticated;
grant select, insert, update, delete on public.ai_agents_config to authenticated;

drop policy if exists "audit_logs_org_scoped" on public.audit_logs;
create policy "audit_logs_org_scoped" on public.audit_logs
  for select to authenticated
  using (organization_id is not null and public.is_org_member(organization_id));

drop policy if exists "audit_logs_insert_org_member" on public.audit_logs;
create policy "audit_logs_insert_org_member" on public.audit_logs
  for insert to authenticated
  with check (
    organization_id is not null
    and public.is_org_member(organization_id)
    and actor_type in ('technician', 'ai_agent')
  );
revoke all on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;
grant insert (id, organization_id, actor_type, actor_label, action, target_ref, created_at)
  on public.audit_logs to authenticated;

drop policy if exists "audit_logs_insert_client_room" on public.audit_logs;

drop policy if exists "enterprise_leads_insert_public" on public.enterprise_leads;
create policy "enterprise_leads_insert_public" on public.enterprise_leads
  for insert to anon, authenticated
  with check (
    char_length(trim(company_name)) >= 2
    and char_length(trim(contact_email)) >= 5
    and char_length(trim(team_size)) >= 1
  );

drop policy if exists "enterprise_leads_select_operators" on public.enterprise_leads;
create policy "enterprise_leads_select_operators" on public.enterprise_leads
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.user_id = (select auth.uid())
        and om.status = 'active'
    ) or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

revoke all on public.enterprise_leads from public, anon, authenticated;
grant insert (company_name, contact_email, team_size, plan_interest)
  on public.enterprise_leads to anon, authenticated;
grant select on public.enterprise_leads to authenticated;

create index if not exists idx_client_devices_organization_id on public.client_devices (organization_id);
create index if not exists idx_audit_logs_organization_id on public.audit_logs (organization_id);
create index if not exists idx_remote_sessions_organization_id on public.remote_sessions (organization_id);
create index if not exists idx_remote_sessions_ticket_id on public.remote_sessions (ticket_id);
create index if not exists idx_tickets_assigned_technician_id on public.tickets (assigned_technician_id);

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

-- ----------------------------------------------------------------------------
-- 15. Postulaciones y Onboarding de Técnicos (Fase 2 — Red de Técnicos)
-- ----------------------------------------------------------------------------
create table if not exists public.technician_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '00000000-0000-4000-8000-000000000001',
  full_name text not null,
  email text not null,
  country text not null,
  birth_date date not null,
  is_adult_verified boolean not null default true,
  modality text not null check (modality in ('half_time', 'full_time')),
  specialties text[] not null default '{}',
  certifications text not null default '',
  nda_accepted boolean not null default false,
  nda_version text not null default 'NDA-TECH-v1.0-2026',
  nda_signature_name text not null,
  nda_accepted_at timestamptz not null default now(),
  technical_score smallint not null check (technical_score >= 0 and technical_score <= 100),
  attitude_score smallint not null check (attitude_score >= 0 and attitude_score <= 100),
  total_score smallint not null check (total_score >= 0 and total_score <= 100),
  recommendation text not null check (recommendation in ('recommended_approve', 'manual_review', 'recommended_reject')),
  timed_out boolean not null default false,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected', 'registered')),
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  invite_used_at timestamptz,
  email_delivery_status text not null default 'not_sent' check (email_delivery_status in ('not_sent', 'sent', 'simulated', 'failed')),
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tech_apps_org_status_created
  on public.technician_applications (organization_id, status, created_at desc);

create index if not exists idx_tech_apps_email_lower
  on public.technician_applications (lower(email));

create index if not exists idx_tech_apps_invite_hash
  on public.technician_applications (invite_token_hash)
  where invite_token_hash is not null;

create index if not exists idx_tech_apps_reviewed_by
  on public.technician_applications (reviewed_by)
  where reviewed_by is not null;

alter table public.technician_applications enable row level security;

revoke all on public.technician_applications from anon, authenticated, public;
grant select on public.technician_applications to authenticated;

drop policy if exists "Org admins can view technician applications" on public.technician_applications;
create policy "Org admins can view technician applications"
  on public.technician_applications
  for select
  to authenticated
  using (public.is_org_admin(organization_id));

-- ----------------------------------------------------------------------------
-- 16. Ledger Financiero (payments) y Liquidaciones de Técnicos (technician_payouts)
-- ----------------------------------------------------------------------------
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

revoke all on public.payments from public, anon, authenticated;
grant select on public.payments to authenticated;

drop policy if exists "payments_select_org_admin_or_assigned" on public.payments;
create policy "payments_select_org_admin_or_assigned"
  on public.payments
  for select
  to authenticated
  using (
    public.is_org_admin(organization_id)
    or technician_id = (select auth.uid())
  );

create table if not exists public.technician_payouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '00000000-0000-4000-8000-000000000001',
  payment_id uuid references public.payments(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  technician_id uuid not null references auth.users(id) on delete cascade,
  gross_amount_usd numeric(10, 2) not null default 0 check (gross_amount_usd >= 0),
  commission_percent integer not null default 65
    check (commission_percent in (65, 75, 80, 85)),
  payout_amount_usd numeric(10, 2) not null default 0 check (payout_amount_usd >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'paid', 'reversed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_technician_payouts_org_created
  on public.technician_payouts (organization_id, created_at desc);

create index if not exists idx_technician_payouts_technician
  on public.technician_payouts (technician_id, status, created_at desc);

alter table public.technician_payouts enable row level security;

revoke all on public.technician_payouts from public, anon, authenticated;
grant select on public.technician_payouts to authenticated;

drop policy if exists "technician_payouts_select_scoped" on public.technician_payouts;
create policy "technician_payouts_select_scoped"
  on public.technician_payouts
  for select
  to authenticated
  using (
    public.is_org_admin(organization_id)
    or technician_id = (select auth.uid())
  );

-- Refresca automáticamente la caché de esquema de PostgREST tras ejecutar la migración
notify pgrst, 'reload schema';
