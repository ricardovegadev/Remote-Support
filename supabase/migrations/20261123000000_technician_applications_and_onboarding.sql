-- ============================================================================
-- Migración: 20261123000000_technician_applications_and_onboarding.sql
-- Fase 2: Tabla technician_applications, NDA interno firmado, tokens de
-- invitación de un solo uso (SHA-256) y trazabilidad de correo Gmail SMTP.
-- ============================================================================

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

notify pgrst, 'reload schema';
