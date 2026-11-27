-- Phase 1: Integridad y Honestidad
-- 1) Trazabilidad real de revisión humana en pre-diagnóstico/resolución
-- 2) Validación de compatibilidad OS / especialidad en asignación de tickets

alter table public.tickets
  add column if not exists human_reviewed_at timestamptz,
  add column if not exists human_reviewed_by text;

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

notify pgrst, 'reload schema';
