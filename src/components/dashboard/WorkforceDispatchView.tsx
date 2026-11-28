import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Globe,
  Landmark,
  Link2,
  Lock,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type {
  DispatchMode,
  MemberTierType,
  Organization,
  OrganizationMember,
  SupportTicket,
  TechnicianAvailability,
  TechnicianPayoutRecord,
  TechnicianSpecialty,
} from '../../types/support';
import {
  canClaimTicket,
  deriveTicketPriority,
  formatCategoryForOs,
  getAvailabilityLabel,
  getDispatchModeLabel,
  getInitials,
  getMemberTypeLabel,
  getPriorityMeta,
  getStatusBadgeClass,
  getTechnicianCommissionTier,
  getTicketStatusLabel,
  isValidEmail,
  matchTechnicianForTicket,
} from '../../utils/ticketLogic';
import {
  canInviteTeamRole,
  hasPermission,
  type OrganizationRole,
} from '../../utils/rbac';
import { createDirectTeamInvite } from '../../services/technicianApplicationService';
import { TechnicianApplicationsPanel } from './TechnicianApplicationsPanel';
import { lazy, Suspense } from 'react';
const TechnicianEarningsChart = lazy(() =>
  import('./TechnicianEarningsChart').then((m) => ({
    default: m.TechnicianEarningsChart,
  }))
);

interface WorkforceDispatchViewProps {
  organization: Organization;
  members: OrganizationMember[];
  tickets: SupportTicket[];
  payouts?: TechnicianPayoutRecord[];
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
  onSettleTechnicianPayouts?: (
    technicianId: string,
    batchReference: string
  ) => void;
  onRecordTeamInviteAudit?: (summary: {
    fullName: string;
    email: string;
    role: string;
  }) => void;
}

const ALL_SPECIALTIES: TechnicianSpecialty[] = [
  'Windows & BSOD',
  'Soporte macOS',
  'Soporte Linux & Servidores',
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
  payouts = [],
  currentTechId,
  operatorRole = 'technician',
  onSelectActiveTech,
  onUpdateAvailability,
  onChangeDispatchMode,
  onInviteMember,
  onClaimTicketAtomically,
  onSettleTechnicianPayouts,
  onRecordTeamInviteAudit,
}: WorkforceDispatchViewProps) {
  const [batchRefByTech, setBatchRefByTech] = useState<Record<string, string>>({});
  const [settlementNotice, setSettlementNotice] = useState<string | null>(null);
  const nowMs = Date.now();
  const orgPayouts = useMemo(
    () => payouts.filter((p) => p.organization_id === organization.id),
    [payouts, organization.id]
  );

  const activeTechPayouts = useMemo(
    () =>
      orgPayouts.filter(
        (p) =>
          p.technician_id === currentTechId ||
          members.some(
            (m) =>
              (m.id === currentTechId || m.user_id === currentTechId) &&
              (m.id === p.technician_id || m.user_id === p.technician_id)
          )
      ),
    [orgPayouts, currentTechId, members]
  );

  const techFinanceSummary = useMemo(() => {
    let inValidationUsd = 0;
    let availableUsd = 0;
    let paidOutUsd = 0;
    for (const p of activeTechPayouts) {
      if (p.status === 'cancelled' || p.status === 'reversed') continue;
      if (p.status === 'paid_out') {
        paidOutUsd += p.payout_amount_usd;
      } else {
        const releasesMs = Date.parse(p.warranty_releases_at) || 0;
        if (p.status === 'scheduled' || releasesMs <= nowMs) {
          availableUsd += p.payout_amount_usd;
        } else {
          inValidationUsd += p.payout_amount_usd;
        }
      }
    }
    const ratedTickets = tickets.filter(
      (t) =>
        (t.assigned_technician_id === currentTechId || t.assigned_to === currentTechId) &&
        typeof t.client_rating === 'number' &&
        t.client_rating >= 1
    );
    const avgStarRating =
      ratedTickets.length > 0
        ? ratedTickets.reduce((sum, t) => sum + (t.client_rating ?? 0), 0) /
          ratedTickets.length
        : null;
    return {
      inValidationUsd: Math.round(inValidationUsd * 100) / 100,
      availableUsd: Math.round(availableUsd * 100) / 100,
      paidOutUsd: Math.round(paidOutUsd * 100) / 100,
      ratedCount: ratedTickets.length,
      avgStarRating,
    };
  }, [activeTechPayouts, tickets, currentTechId, nowMs]);

  const adminTreasurySummary = useMemo(() => {
    let grossCollectedUsd = 0;
    let gatewayFeesUsd = 0;
    let techLiabilityUsd = 0;
    let platformMarginUsd = 0;
    const byTech = new Map<
      string,
      {
        technicianId: string;
        technicianName: string;
        inValidationUsd: number;
        availableUsd: number;
        paidOutUsd: number;
        availableCount: number;
        lastBatchRef: string | null;
      }
    >();

    for (const p of orgPayouts) {
      if (p.status === 'cancelled' || p.status === 'reversed') continue;
      grossCollectedUsd += p.gross_amount_usd;
      gatewayFeesUsd += p.gateway_fee_usd;
      platformMarginUsd += p.platform_net_usd;

      const entry = byTech.get(p.technician_id) ?? {
        technicianId: p.technician_id,
        technicianName: p.technician_name,
        inValidationUsd: 0,
        availableUsd: 0,
        paidOutUsd: 0,
        availableCount: 0,
        lastBatchRef: null,
      };
      if (p.status === 'paid_out') {
        entry.paidOutUsd += p.payout_amount_usd;
        if (p.payout_batch_reference && !entry.lastBatchRef) {
          entry.lastBatchRef = p.payout_batch_reference;
        }
      } else {
        techLiabilityUsd += p.payout_amount_usd;
        const releasesMs = Date.parse(p.warranty_releases_at) || 0;
        if (p.status === 'scheduled' || releasesMs <= nowMs) {
          entry.availableUsd += p.payout_amount_usd;
          entry.availableCount += 1;
        } else {
          entry.inValidationUsd += p.payout_amount_usd;
        }
      }
      byTech.set(p.technician_id, entry);
    }

    return {
      grossCollectedUsd: Math.round(grossCollectedUsd * 100) / 100,
      gatewayFeesUsd: Math.round(gatewayFeesUsd * 100) / 100,
      techLiabilityUsd: Math.round(techLiabilityUsd * 100) / 100,
      platformMarginUsd: Math.round(platformMarginUsd * 100) / 100,
      technicianRows: Array.from(byTech.values()),
    };
  }, [orgPayouts, nowMs]);
  const canManageWorkforce = hasPermission(operatorRole, 'workforce:manage');
  const canReviewApplications = hasPermission(
    operatorRole,
    'applications:review'
  );
  const canInviteDirectSpecialist = canInviteTeamRole(
    operatorRole,
    'technician'
  );
  const [tierFilter, setTierFilter] = useState<'all' | MemberTierType>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRate, setInviteRate] = useState('15');
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Modal Invitar Especialista Directo (Owner / Admin / Supervisor)
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [directName, setDirectName] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directSpecialties, setDirectSpecialties] = useState<
    TechnicianSpecialty[]
  >(['Windows & BSOD', 'Redes & VPN']);
  const [directBusy, setDirectBusy] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);
  const [directInviteLink, setDirectInviteLink] = useState<string | null>(null);
  const [directCopied, setDirectCopied] = useState(false);

  useEffect(() => {
    setTierFilter('all');
    setInviteOpen(false);
    setInviteError(null);
    setClaimingId(null);
    setDirectModalOpen(false);
    setDirectInviteLink(null);
    setDirectError(null);
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

  const toggleDirectSpecialty = (spec: TechnicianSpecialty) => {
    setDirectSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleDirectSpecialistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);
    setDirectCopied(false);

    if (directName.trim().length < 2) {
      setDirectError('Ingresa el nombre completo del especialista.');
      return;
    }
    if (!isValidEmail(directEmail)) {
      setDirectError('Ingresa un correo electrónico válido.');
      return;
    }
    if (directSpecialties.length === 0) {
      setDirectError('Selecciona al menos una especialidad aprobada.');
      return;
    }

    setDirectBusy(true);
    try {
      const res = await createDirectTeamInvite({
        fullName: directName.trim(),
        email: directEmail.trim().toLowerCase(),
        role: 'technician',
        organizationId: organization.id,
        approved_specialties: directSpecialties,
        actorRole: operatorRole,
      });
      if (!res.ok || !res.inviteUrl) {
        setDirectError(
          res.error ?? 'No se pudo generar la invitación directa.'
        );
        return;
      }
      setDirectInviteLink(res.inviteUrl);
      onRecordTeamInviteAudit?.({
        fullName: directName.trim(),
        email: directEmail.trim().toLowerCase(),
        role: 'technician',
      });
    } finally {
      setDirectBusy(false);
    }
  };

  const handleCopyDirectLink = async () => {
    if (!directInviteLink) return;
    try {
      await navigator.clipboard.writeText(directInviteLink);
      setDirectCopied(true);
      window.setTimeout(() => setDirectCopied(false), 2500);
    } catch {
      setDirectError('Copia el enlace manualmente desde el cuadro resaltado.');
    }
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
                Cola de solicitudes disponibles ({unassignedTickets.length} sin asignar)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Al pulsar &ldquo;Aceptar solicitud&rdquo;, el ticket queda asignado exclusivamente al especialista compatible.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-emerald-800 self-start sm:self-auto shrink-0">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Asignación exclusiva</span>
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
                const matchResult = currentMember
                  ? matchTechnicianForTicket(ticket, currentMember)
                  : { compatible: true, score: 50, reason: 'Sin perfil activo', matchedSpecialties: [] };
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
                        {formatCategoryForOs(ticket.category, ticket.os_type)} · {ticket.os_type}
                      </p>

                      <p
                        className={`text-[11px] font-semibold ${
                          matchResult.compatible ? 'text-emerald-700' : 'text-amber-800'
                        }`}
                      >
                        {matchResult.reason}
                      </p>

                      <p className="text-xs text-[#64748B] line-clamp-2">
                        {ticket.problem_description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={claimingId === ticket.id || !matchResult.compatible}
                      onClick={() => void handleClaim(ticket)}
                      title={matchResult.compatible ? 'Aceptar solicitud compatible' : matchResult.reason}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {claimingId === ticket.id
                          ? 'Asignando solicitud...'
                          : !matchResult.compatible
                          ? `Requiere ${ticket.os_type}`
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

        {/* Right 35% (4 cols): Dispatch Mode Selector (Admin/Owner only) */}
        {canManageWorkforce && (
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
        )}
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

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {canInviteDirectSpecialist && (
              <button
                type="button"
                data-testid="open-direct-specialist-invite-btn"
                onClick={() => {
                  setDirectError(null);
                  setDirectInviteLink(null);
                  setDirectCopied(false);
                  setDirectModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap shadow-sm"
              >
                <Link2 className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                <span>Invitar Especialista Directo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setInviteOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors whitespace-nowrap shadow-sm"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Invitar freelancer</span>
            </button>
          </div>
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

      {/* Desglose Financiero Transparente del Especialista (ADR-06) */}
      <div
        data-testid="technician-net-earnings-panel"
        className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
              <span>Mis liquidaciones sobre ingreso neto</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Comisión calculada sobre Base Neta (Bruto − Comisión de Pasarela) con garantía de 48 h y retiro semanal.
            </p>
          </div>
          {(() => {
            const activeMember = members.find(
              (m) => m.user_id === currentTechId || m.id === currentTechId
            );
            const tier = getTechnicianCommissionTier(activeMember?.resolved_count ?? 0);
            const shownRating =
              techFinanceSummary.avgStarRating ?? activeMember?.rating ?? 5.0;
            return (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] font-semibold tabular-nums">
                  <span>Nivel {tier.label} · {tier.commissionPercent}% sobre neto</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-semibold tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                  <span>
                    {shownRating.toFixed(2)}★
                    {techFinanceSummary.ratedCount > 0
                      ? ` (${techFinanceSummary.ratedCount} reseñas)`
                      : ''}
                  </span>
                </span>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#E5E9F2] bg-[#F8FAFC] p-4 space-y-1">
            <p className="text-xs text-[#64748B] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>En validación (Garantía 48 h)</span>
            </p>
            <p className="text-xl font-bold text-[#0F172A] tabular-nums">
              ${techFinanceSummary.inValidationUsd.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
            <p className="text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>Disponible para retiro semanal</span>
            </p>
            <p className="text-xl font-bold text-emerald-900 tabular-nums">
              ${techFinanceSummary.availableUsd.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E9F2] bg-white p-4 space-y-1">
            <p className="text-xs text-[#64748B]">Total liquidado (paid_out)</p>
            <p className="text-xl font-bold text-[#0F172A] tabular-nums">
              ${techFinanceSummary.paidOutUsd.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Gráfico de Barras Bruto vs Neto (recharts) */}
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-slate-500 bg-white border border-[#E5E9F2] rounded-xl">
              Cargando gráfico financiero...
            </div>
          }
        >
          <TechnicianEarningsChart tickets={tickets} payouts={payouts} />
        </Suspense>

        {activeTechPayouts.length === 0 ? (
          <p className="text-xs text-[#64748B] py-3">
            Aún no tienes liquidaciones registradas. Al confirmarse tus tickets resueltos verás el desglose Bruto → Pasarela → Neto aquí.
          </p>
        ) : (
          <div className="overflow-x-auto border border-[#E5E9F2] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E9F2] text-[#64748B]">
                  <th className="py-2.5 px-3 font-semibold">Ticket / Pasarela</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Bruto</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Pasarela</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Base Neta</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tu %</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Pago Neto</th>
                  <th className="py-2.5 px-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F2]">
                {activeTechPayouts.map((p) => {
                  const releasesMs = Date.parse(p.warranty_releases_at) || 0;
                  const statusLabel =
                    p.status === 'cancelled'
                      ? 'Anulado ($0)'
                      : p.status === 'paid_out'
                      ? `Liquidado (${p.payout_batch_reference ?? 'Lote'})`
                      : p.status === 'scheduled' || releasesMs <= nowMs
                      ? 'Disponible'
                      : 'En validación 48 h';
                  const badgeClass =
                    p.status === 'cancelled'
                      ? 'bg-slate-100 text-slate-600'
                      : p.status === 'paid_out'
                      ? 'bg-emerald-100 text-emerald-800'
                      : p.status === 'scheduled' || releasesMs <= nowMs
                      ? 'bg-blue-100 text-[#1D4ED8]'
                      : 'bg-amber-100 text-amber-800';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-[#0F172A] whitespace-nowrap">
                        <span className="font-mono font-bold">{p.ticket_code}</span>
                        <span className="text-[#64748B] ml-1.5 uppercase text-[10px]">
                          {p.payment_gateway}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[#0F172A]">
                        ${p.gross_amount_usd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-red-700">
                        −${p.gateway_fee_usd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium text-[#0F172A]">
                        ${p.net_amount_usd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[#2563EB] font-semibold">
                        {p.commission_percent}%
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700">
                        ${p.payout_amount_usd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel Administrativo: Tesorería y Liquidaciones Semanales (ADR-06) */}
      {canManageWorkforce && (
        <div
          data-testid="admin-treasury-panel"
          className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>Tesorería y Liquidaciones Semanales</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Contabilidad separada entre Pasivo Reservado a Técnicos y Margen Neto de Plataforma tras pasarela.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] px-2.5 py-1 rounded-lg self-start sm:self-auto">
              Custodia garantía 48 h · Lotes semanales
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#E5E9F2] bg-[#F8FAFC] p-4 space-y-1">
              <p className="text-xs text-[#64748B]">Recaudado Bruto</p>
              <p
                data-testid="treasury-gross-kpi"
                className="text-xl font-bold text-[#0F172A] tabular-nums"
              >
                ${adminTreasurySummary.grossCollectedUsd.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E9F2] bg-[#F8FAFC] p-4 space-y-1">
              <p className="text-xs text-[#64748B]">Comisiones Pasarela</p>
              <p
                data-testid="treasury-fees-kpi"
                className="text-xl font-bold text-red-700 tabular-nums"
              >
                −${adminTreasurySummary.gatewayFeesUsd.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-1">
              <p className="text-xs font-medium text-amber-900">
                Pasivo Reservado a Técnicos
              </p>
              <p
                data-testid="treasury-liability-kpi"
                className="text-xl font-bold text-amber-950 tabular-nums"
              >
                ${adminTreasurySummary.techLiabilityUsd.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
              <p className="text-xs font-medium text-emerald-900">
                Margen Neto Plataforma
              </p>
              <p
                data-testid="treasury-margin-kpi"
                className="text-xl font-bold text-emerald-900 tabular-nums"
              >
                ${adminTreasurySummary.platformMarginUsd.toFixed(2)}
              </p>
            </div>
          </div>

          {settlementNotice && (
            <div
              role="status"
              className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-900"
            >
              {settlementNotice}
            </div>
          )}

          {adminTreasurySummary.technicianRows.length === 0 ? (
            <p className="text-xs text-[#64748B]">
              Sin saldos pendientes de liquidación semanal en esta organización.
            </p>
          ) : (
            <div className="overflow-x-auto border border-[#E5E9F2] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E9F2] text-[#64748B]">
                    <th className="py-2.5 px-3 font-semibold">Especialista</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      En validación 48 h
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Disponible lote
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Ya liquidado
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      Liquidación por lote semanal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9F2]">
                  {adminTreasurySummary.technicianRows.map((row) => {
                    const defaultRef = `LOTE-${new Date().toISOString().slice(0, 10)}`;
                    const inputRef = batchRefByTech[row.technicianId] ?? defaultRef;
                    return (
                      <tr key={row.technicianId}>
                        <td className="py-3 px-3 font-semibold text-[#0F172A] whitespace-nowrap">
                          {row.technicianName}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-amber-800">
                          ${row.inValidationUsd.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-[#1D4ED8]">
                          ${row.availableUsd.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-emerald-700">
                          ${row.paidOutUsd.toFixed(2)}
                          {row.lastBatchRef && (
                            <span className="block text-[10px] font-mono text-[#64748B]">
                              {row.lastBatchRef}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {row.availableUsd > 0 && onSettleTechnicianPayouts ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                aria-label={`Referencia de lote para ${row.technicianName}`}
                                value={inputRef}
                                onChange={(e) =>
                                  setBatchRefByTech((prev) => ({
                                    ...prev,
                                    [row.technicianId]: e.target.value,
                                  }))
                                }
                                className="w-36 rounded-lg border border-[#E5E9F2] bg-white px-2.5 py-1.5 text-xs font-mono text-[#0F172A]"
                              />
                              <button
                                type="button"
                                data-testid={`settle-batch-btn-${row.technicianId}`}
                                onClick={() => {
                                  onSettleTechnicianPayouts(row.technicianId, inputRef);
                                  setSettlementNotice(
                                    `Lote ${inputRef} marcado como paid_out para ${row.technicianName} ($${row.availableUsd.toFixed(2)}).`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                              >
                                Liquidar lote (paid_out)
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#64748B]">Sin saldo disponible</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Panel de Postulantes Técnicos (Fase 2 — Aprobación 1-clic + Gmail) */}
      {canReviewApplications && <TechnicianApplicationsPanel />}

      {/* Modal Compacto: Invitar Especialista Directo (salta /postular · enlace 72 h) */}
      {directModalOpen && canInviteDirectSpecialist && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="direct-specialist-invite-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDirectModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-[#0B1528]/55 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E5E9F2] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-[#E5E9F2] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <h3
                    id="direct-specialist-invite-title"
                    className="text-sm font-bold text-[#0F172A]"
                  >
                    Invitar Especialista Directo
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Genera un enlace directo de registro válido por 72 h (sin pasar por /postular).
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar modal de invitación directa"
                onClick={() => setDirectModalOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleDirectSpecialistSubmit(e)}
              noValidate
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="direct-spec-name"
                    className="block text-xs font-semibold text-[#0F172A] mb-1"
                  >
                    Nombre completo *
                  </label>
                  <input
                    id="direct-spec-name"
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="Ej. Carlos Andrade"
                    className="w-full rounded-xl border border-[#E5E9F2] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="direct-spec-email"
                    className="block text-xs font-semibold text-[#0F172A] mb-1"
                  >
                    Correo electrónico *
                  </label>
                  <input
                    id="direct-spec-email"
                    type="email"
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder="carlos@soporte.com"
                    className="w-full rounded-xl border border-[#E5E9F2] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#0F172A] mb-2">
                  Especialidades aprobadas ({directSpecialties.length} seleccionadas) *
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SPECIALTIES.map((spec) => {
                    const selected = directSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleDirectSpecialty(spec)}
                        aria-pressed={selected}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          selected
                            ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#2563EB]'
                            : 'bg-white text-[#64748B] border-[#E5E9F2] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {directError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-800"
                >
                  {directError}
                </div>
              )}

              {directInviteLink && (
                <div
                  data-testid="direct-specialist-invite-result"
                  className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-emerald-900">
                      Enlace directo listo (un solo uso · 72 h)
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyDirectLink()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{directCopied ? '¡Enlace copiado!' : 'Copiar enlace'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-emerald-950 bg-white border border-emerald-200 rounded px-2.5 py-1.5 break-all">
                    {directInviteLink}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E9F2]">
                <button
                  type="button"
                  onClick={() => setDirectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] bg-white border border-[#E5E9F2] hover:bg-[#F8FAFC] rounded-xl"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={directBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-xl shadow-sm"
                >
                  <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {directBusy
                      ? 'Generando enlace...'
                      : 'Generar enlace de especialista'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
