import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Globe,
  Lock,
  ShieldCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import type {
  DispatchMode,
  MemberTierType,
  Organization,
  OrganizationMember,
  SupportTicket,
  TechnicianAvailability,
  TechnicianSpecialty,
} from '../../types/support';
import {
  canClaimTicket,
  deriveTicketPriority,
  getAvailabilityLabel,
  getDispatchModeLabel,
  getInitials,
  getMemberTypeLabel,
  getPriorityMeta,
  getStatusBadgeClass,
  getTicketStatusLabel,
  isValidEmail,
} from '../../utils/ticketLogic';
import {
  hasPermission,
  type OrganizationRole,
} from '../../utils/rbac';
import { TechnicianApplicationsPanel } from './TechnicianApplicationsPanel';

interface WorkforceDispatchViewProps {
  organization: Organization;
  members: OrganizationMember[];
  tickets: SupportTicket[];
  currentTechId: string;
  operatorRole?: OrganizationRole;
  onSelectActiveTech?: (techId: string) => void;
  onUpdateAvailability: (
    memberId: string,
    patch: Partial<{
      availability_status: TechnicianAvailability;
      specialties: TechnicianSpecialty[];
      accepting_requests: boolean;
    }>
  ) => void;
  onChangeDispatchMode: (mode: DispatchMode) => void;
  onInviteMember: (input: {
    full_name: string;
    email: string;
    member_type: MemberTierType;
    agreed_ticket_rate_usd: number;
    specialties: TechnicianSpecialty[];
  }) => void;
  onClaimTicketAtomically: (
    ticketId: string,
    techId: string,
    techName: string,
    techSpecialty: string
  ) => Promise<void>;
}

const ALL_SPECIALTIES: TechnicianSpecialty[] = [
  'Windows & BSOD',
  'Microsoft 365 & Outlook',
  'Impresoras',
  'Redes & VPN',
  'Seguridad & Malware',
  'Recuperación de Datos',
];

const AVAILABILITY_OPTIONS: TechnicianAvailability[] = [
  'available',
  'busy',
  'paused',
  'offline',
];

const DISPATCH_MODES: Array<{ id: DispatchMode; hint: string }> = [
  {
    id: 'smart',
    hint: 'Prioriza especialidad y disponibilidad en tiempo real',
  },
  {
    id: 'manual',
    hint: 'Los técnicos reclaman solicitudes desde la cola',
  },
  {
    id: 'round_robin',
    hint: 'Distribuye equitativamente entre técnicos activos',
  },
];

export function WorkforceDispatchView({
  organization,
  members,
  tickets,
  currentTechId,
  operatorRole = 'technician',
  onSelectActiveTech,
  onUpdateAvailability,
  onChangeDispatchMode,
  onInviteMember,
  onClaimTicketAtomically,
}: WorkforceDispatchViewProps) {
  const canManageWorkforce = hasPermission(operatorRole, 'workforce:manage');
  const canReviewApplications = hasPermission(
    operatorRole,
    'applications:review'
  );
  const [tierFilter, setTierFilter] = useState<'all' | MemberTierType>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRate, setInviteRate] = useState('15');
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    setTierFilter('all');
    setInviteOpen(false);
    setInviteError(null);
    setClaimingId(null);
  }, [organization.id]);

  const currentMember =
    members.find(
      (m) => m.user_id === currentTechId || m.id === currentTechId
    ) ??
    members[0] ??
    null;

  const unassignedTickets = tickets.filter((t) => canClaimTicket(t));
  const claimedTickets = tickets.filter(
    (t) => Boolean(t.assigned_to || t.assigned_technician_id)
  );

  const visibleMembers = members.filter(
    (m) => tierFilter === 'all' || m.member_type === tierFilter
  );

  const toggleSpecialty = (spec: TechnicianSpecialty) => {
    if (!currentMember) return;
    const has = currentMember.specialties.includes(spec);
    const next = has
      ? currentMember.specialties.filter((s) => s !== spec)
      : [...currentMember.specialties, spec];
    if (next.length === 0) return;
    onUpdateAvailability(currentMember.id, { specialties: next });
  };

  const handleClaim = async (ticket: SupportTicket) => {
    if (!currentMember) return;
    setClaimingId(ticket.id);
    try {
      await onClaimTicketAtomically(
        ticket.id,
        currentMember.user_id ?? currentMember.id,
        currentMember.full_name,
        currentMember.specialties.join(' · ')
      );
    } finally {
      setClaimingId(null);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteName.trim().length < 2) {
      setInviteError('Ingresa el nombre del colaborador freelance.');
      return;
    }
    if (!isValidEmail(inviteEmail)) {
      setInviteError('Ingresa un correo válido.');
      return;
    }
    const rate = Number(inviteRate);
    if (Number.isNaN(rate) || rate < 1) {
      setInviteError('Define una tarifa pactada válida en USD.');
      return;
    }
    setInviteError(null);
    onInviteMember({
      full_name: inviteName,
      email: inviteEmail,
      member_type: 'freelancer',
      agreed_ticket_rate_usd: rate,
      specialties: ['Windows & BSOD', 'Redes & VPN'],
    });
    setInviteName('');
    setInviteEmail('');
    setInviteOpen(false);
  };

  const getAvailabilityPillClass = (status: TechnicianAvailability) => {
    switch (status) {
      case 'available':
        return 'bg-[#D1FAE5] text-emerald-800';
      case 'busy':
        return 'bg-[#FEF3C7] text-amber-800';
      case 'paused':
        return 'bg-[#E0F2FE] text-sky-800';
      case 'offline':
        return 'bg-slate-100 text-[#475569]';
    }
  };

  return (
    <div data-testid="workforce-dispatch-view" className="space-y-6">
      {/* Top Technician Status Pill Selector & Specialties */}
      {currentMember && (
        <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] text-[#1D4ED8] text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(currentMember.full_name)}
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
                  ESTADO OPERATIVO DEL TÉCNICO
                </p>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  {currentMember.full_name}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onSelectActiveTech && members.length > 1 && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="active-tech-selector"
                    className="text-xs font-medium text-[#64748B] whitespace-nowrap"
                  >
                    Operando como:
                  </label>
                  <select
                    id="active-tech-selector"
                    value={currentMember.user_id ?? currentMember.id}
                    onChange={(e) => onSelectActiveTech(e.target.value)}
                    className="rounded-lg border border-[#E5E9F2] bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none max-w-[200px]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.user_id ?? m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none px-3.5 py-2 rounded-full bg-[#F8FAFC] border border-[#E5E9F2]">
                <input
                  type="checkbox"
                  checked={currentMember.accepting_requests}
                  onChange={(e) =>
                    onUpdateAvailability(currentMember.id, {
                      accepting_requests: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-xs font-semibold text-[#0F172A]">
                  Recibir solicitudes
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-[#64748B] mb-2">
                Disponibilidad en vivo
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY_OPTIONS.map((status) => {
                  const active = currentMember.availability_status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        onUpdateAvailability(currentMember.id, {
                          availability_status: status,
                        })
                      }
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                        active
                          ? status === 'available'
                            ? 'bg-[#D1FAE5] text-emerald-800 border-[#6EE7B7]'
                            : 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-white text-[#475569] border-[#E5E9F2] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {getAvailabilityLabel(status)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#64748B] mb-2">
                Especialidades activas
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_SPECIALTIES.map((spec) => {
                  const active = currentMember.specialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                        active
                          ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                          : 'bg-white text-[#64748B] border-[#E5E9F2] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {spec}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 65% / 35% Split: Incoming Queue (Left) + Dispatch Mode Selector (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 65% (8 cols): Atomic Claim Queue */}
        <div className="xl:col-span-8 bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Cola de despacho atómico ({unassignedTickets.length} sin asignar)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Al pulsar &ldquo;Aceptar solicitud&rdquo;,{' '}
                <span className="font-mono text-[#0F172A]">
                  claim_ticket_atomically
                </span>{' '}
                bloquea el ticket sin colisiones entre técnicos.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-emerald-800 self-start sm:self-auto shrink-0">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Bloqueo transaccional</span>
            </span>
          </div>

          {unassignedTickets.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] text-center text-xs text-[#64748B]">
              Todas las solicitudes activas ya han sido reclamadas por
              especialistas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unassignedTickets.map((ticket) => {
                const priorityMeta = getPriorityMeta(
                  deriveTicketPriority(ticket)
                );
                return (
                  <div
                    key={ticket.id}
                    data-testid={`atomic-ticket-${ticket.ticket_code}`}
                    className="p-4 rounded-xl border border-[#E5E9F2] bg-[#F8FAFC] flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono tabular-nums text-xs font-bold text-[#0F172A]">
                          {ticket.ticket_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityMeta.badgeClass}`}
                        >
                          {priorityMeta.label}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-[#0F172A]">
                        {ticket.client_name} · {ticket.service_tier}
                      </p>

                      <p className="text-[11px] font-medium text-[#2563EB]">
                        {ticket.category} · {ticket.os_type}
                      </p>

                      <p className="text-xs text-[#64748B] line-clamp-2">
                        {ticket.problem_description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={claimingId === ticket.id}
                      onClick={() => void handleClaim(ticket)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-xl transition-colors shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {claimingId === ticket.id
                          ? 'Bloqueando ticket...'
                          : 'Aceptar solicitud'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {claimedTickets.length > 0 && (
            <div className="pt-4 border-t border-[#E5E9F2]">
              <p className="text-xs font-semibold text-[#64748B] mb-3">
                Solicitudes asignadas recientemente
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {claimedTickets.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-[#E5E9F2] bg-white text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[#0F172A]">
                        {t.ticket_code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeClass(
                          t.status
                        )}`}
                      >
                        {getTicketStatusLabel(t.status)}
                      </span>
                    </div>
                    <p className="text-[#475569] truncate">
                      Técnico: <strong>{t.assigned_technician_name}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 35% (4 cols): Dispatch Mode Selector */}
        <div className="xl:col-span-4 bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            <Zap className="w-4 h-4" aria-hidden="true" />
            <span>MOTOR DE DESPACHO</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Modo de asignación
            </h3>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              Define cómo {organization.name} distribuye los tickets entre
              técnicos internos, freelancers y red de desborde.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {DISPATCH_MODES.map((mode) => {
              const active = organization.dispatch_mode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeDispatchMode(mode.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    active
                      ? 'bg-[#EFF6FF] border-[#2563EB] ring-1 ring-[#2563EB]'
                      : 'bg-white border-[#E5E9F2] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        active ? 'text-[#1D4ED8]' : 'text-[#0F172A]'
                      }`}
                    >
                      {getDispatchModeLabel(mode.id)}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      {mode.hint}
                    </p>
                  </div>
                  {active && (
                    <CheckCircle2
                      className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3-Tier Flexible Workforce Management */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Fuerza laboral flexible en 3 niveles
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Técnicos internos, colaboradores freelance invitados con tarifa por
              ticket y red global de desborde.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setInviteOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors whitespace-nowrap self-start sm:self-auto shadow-sm"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Invitar freelancer</span>
          </button>
        </div>

        {inviteOpen && (
          <form
            onSubmit={handleInviteSubmit}
            noValidate
            className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label
                htmlFor="invite-full-name"
                className="block text-xs font-semibold text-[#0F172A] mb-1"
              >
                Nombre completo
              </label>
              <input
                id="invite-full-name"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ej. Elena Vargas"
                className="w-full rounded-lg border border-[#E5E9F2] bg-white px-3 py-2 text-xs text-[#0F172A] placeholder:text-slate-500"
              />
            </div>
            <div>
              <label
                htmlFor="invite-email"
                className="block text-xs font-semibold text-[#0F172A] mb-1"
              >
                Correo
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="elena@freelance.ec"
                className="w-full rounded-lg border border-[#E5E9F2] bg-white px-3 py-2 text-xs text-[#0F172A] placeholder:text-slate-500"
              />
            </div>
            <div>
              <label
                htmlFor="invite-rate"
                className="block text-xs font-semibold text-[#0F172A] mb-1"
              >
                Tarifa pactada ($ USD)
              </label>
              <input
                id="invite-rate"
                type="number"
                min={1}
                value={inviteRate}
                onChange={(e) => setInviteRate(e.target.value)}
                className="w-full rounded-lg border border-[#E5E9F2] bg-white px-3 py-2 text-xs font-mono text-[#0F172A]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg"
            >
              Enviar invitación
            </button>
            {inviteError && (
              <p className="sm:col-span-4 text-xs font-medium text-[#DC2626]">
                {inviteError}
              </p>
            )}
          </form>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'internal', label: 'Técnicos Internos' },
              { id: 'freelancer', label: 'Freelancers Invitados' },
              { id: 'network', label: 'Red Global de Desborde' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap ${
                tierFilter === tab.id
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'bg-white text-[#64748B] border-[#E5E9F2] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleMembers.map((member) => (
            <div
              key={member.id}
              className="border border-[#E5E9F2] rounded-xl p-4 space-y-3 bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] text-xs font-bold flex items-center justify-center shrink-0">
                    {getInitials(member.full_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[#2563EB] flex items-center gap-1">
                      {member.member_type === 'network' ? (
                        <Globe className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <Users className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>{getMemberTypeLabel(member.member_type)}</span>
                    </p>
                    <p className="text-sm font-bold text-[#0F172A] truncate mt-0.5">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-[#64748B] truncate">
                      {member.email}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${getAvailabilityPillClass(
                    member.availability_status
                  )}`}
                >
                  {getAvailabilityLabel(member.availability_status)}
                </span>
              </div>

              <div className="text-xs text-[#475569]">
                Especialidades: {member.specialties.join(' · ')}
              </div>

              <div className="pt-2.5 border-t border-[#E5E9F2] flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums font-semibold text-[#0F172A]">
                  {member.agreed_ticket_rate_usd > 0
                    ? `$${member.agreed_ticket_rate_usd} USD / ticket`
                    : 'Nómina interna'}
                </span>
                <span className="font-mono tabular-nums text-[#64748B]">
                  {member.resolved_count} resueltos · {member.rating.toFixed(2)}★
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de Postulantes Técnicos (Fase 2 — Aprobación 1-clic + Gmail) */}
      {canReviewApplications && <TechnicianApplicationsPanel />}
    </div>
  );
}
