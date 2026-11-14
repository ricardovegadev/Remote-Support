import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Headphones,
  Monitor,
  Plus,
  ShieldCheck,
  Ticket,
  Users,
  Workflow,
} from 'lucide-react';
import type {
  AiAgentConfig,
  DashboardSection,
  Organization,
  OrganizationMember,
  RemoteSessionRecord,
  SupportTicket,
  TicketPriority,
  TicketStatus,
} from '../../types/support';
import {
  computeAverageResponseMinutes,
  deriveTicketPriority,
  formatRustDeskId,
  getInitials,
  getTicketStatusLabel,
} from '../../utils/ticketLogic';

interface DashboardOverviewProps {
  organization: Organization;
  tickets: SupportTicket[];
  members: OrganizationMember[];
  sessions: RemoteSessionRecord[];
  aiAgents: AiAgentConfig[];
  supabaseConfigured: boolean;
  searchQuery?: string;
  onNavigateSection: (section: DashboardSection) => void;
  onSelectTicket: (ticketId: string) => void;
  onOpenNewTicketModal: () => void;
  onOpenPublicPortal: () => void;
}

const AVATAR_STYLES = [
  'bg-[#EFF6FF] text-[#2563EB]',
  'bg-[#F3E8FF] text-[#7C3AED]',
  'bg-[#FFEDD5] text-[#EA580C]',
  'bg-[#ECFDF5] text-[#059669]',
];

function padTwoDigits(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function getOverviewPriorityStyle(priority: TicketPriority): {
  label: string;
  className: string;
} {
  switch (priority) {
    case 'high':
      return {
        label: 'Alta',
        className: 'bg-[#FEE2E2] text-[#DC2626]',
      };
    case 'medium':
      return {
        label: 'Media',
        className: 'bg-[#FEF3C7] text-[#D97706]',
      };
    case 'low':
      return {
        label: 'Baja',
        className: 'bg-[#D1FAE5] text-[#059669]',
      };
  }
}

function getOverviewStatusStyle(status: TicketStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'waiting_payment':
      return {
        label: getTicketStatusLabel(status),
        className: 'bg-[#FEF3C7] text-[#D97706]',
      };
    case 'in_progress':
      return {
        label: getTicketStatusLabel(status),
        className: 'bg-[#DBEAFE] text-[#2563EB]',
      };
    case 'ready_to_connect':
      return {
        label: getTicketStatusLabel(status),
        className: 'bg-[#D1FAE5] text-[#059669]',
      };
    case 'resolved':
      return {
        label: getTicketStatusLabel(status),
        className: 'bg-[#ECFDF5] text-[#059669]',
      };
  }
}

export function DashboardOverview({
  organization,
  tickets,
  members,
  sessions,
  aiAgents,
  supabaseConfigured,
  searchQuery = '',
  onNavigateSection,
  onSelectTicket,
  onOpenNewTicketModal,
}: DashboardOverviewProps) {
  const openTickets = tickets.filter((t) => t.status !== 'resolved');
  const activeSessions = tickets.filter((t) => t.status === 'in_progress');
  const availableTechs = members.filter(
    (m) => m.availability_status === 'available' && m.accepting_requests
  );
  const responseTimeMetric = computeAverageResponseMinutes(tickets, sessions);
  const activeAiCount = aiAgents.filter((a) => a.is_enabled).length;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredTickets = tickets.filter((ticket) => {
    if (!normalizedQuery) return true;
    return (
      ticket.ticket_code.toLowerCase().includes(normalizedQuery) ||
      ticket.client_name.toLowerCase().includes(normalizedQuery) ||
      ticket.category.toLowerCase().includes(normalizedQuery) ||
      ticket.problem_description.toLowerCase().includes(normalizedQuery)
    );
  });

  const recentTickets = filteredTickets.slice(0, 4);

  return (
    <div data-testid="dashboard-overview" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#34D399]"
              aria-hidden="true"
            />
            <span>PLATAFORMA DE SOPORTE PROFESIONAL</span>
          </p>
          <h1
            id="tech-portal-heading"
            className="text-[27px] sm:text-[32px] font-bold tracking-tight text-[#0F172A] leading-tight mt-1.5"
          >
            Centro de operaciones
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#64748B] leading-relaxed mt-1">
            Supervisa las operaciones y administra tu servicio de soporte remoto
            en {organization.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewTicketModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-[0_6px_16px_rgba(37,99,235,0.28)] transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.2} aria-hidden="true" />
          <span>Nueva solicitud</span>
        </button>
      </div>

      {/* Blue Gradient Hero Banner matching Reference Screenshot */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-[0_10px_28px_rgba(13,45,98,0.16)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        style={{
          background:
            'linear-gradient(135deg, #0D2D62 0%, #154A9B 55%, #1D64D8 100%)',
        }}
      >
        {/* Subtle decorative background circles */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 w-64 h-64 rounded-full border border-white/10 bg-white/[0.03]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-10 -bottom-20 w-52 h-52 rounded-full border border-white/10"
        />

        <div className="lg:col-span-8 space-y-3 relative z-10 pr-12 sm:pr-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/70">
            REMOTE SUPPORT 365
          </p>
          <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight leading-[1.18] text-white">
            Tu operación de soporte, bajo control.
          </h2>
          <p className="text-[14px] text-white/80 leading-relaxed max-w-lg">
            Un espacio unificado para atender clientes, coordinar técnicos y
            gestionar sesiones remotas.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigateSection('tickets')}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 rounded-xl transition-colors backdrop-blur-sm"
            >
              <span>Explorar solicitudes</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right Composition visible cleanly across mobile & desktop */}
        <div
          aria-hidden="true"
          className="pointer-events-none lg:col-span-4 absolute right-4 top-1/2 -translate-y-1/2 sm:right-8 lg:static lg:translate-y-0 flex items-center justify-end lg:pr-2 z-0 lg:z-10"
        >
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/[0.07] lg:bg-white/10 border border-white/12 lg:border-white/20 backdrop-blur-sm flex items-center justify-center">
              <Headphones
                className="w-8 h-8 sm:w-10 sm:h-10 text-white/35 lg:text-white/90"
                strokeWidth={1.7}
              />
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/[0.06] lg:bg-white/12 border border-white/12 lg:border-white/20 backdrop-blur-sm flex items-center justify-center absolute -bottom-2.5 -left-6 sm:-bottom-3 sm:-left-7">
              <ShieldCheck
                className="w-4 h-4 sm:w-5 sm:h-5 text-white/30 lg:text-blue-100"
                strokeWidth={1.7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI White Cards (2x2 on mobile/tablet, 4x1 on desktop) */}
      <div
        data-testid="dashboard-metrics-bar"
        className="grid grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4"
      >
        <div className="bg-white border border-[#E5E9F2] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3.5">
          <span className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
            <Ticket className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-normal text-[#64748B] leading-snug">
              Solicitudes abiertas
            </p>
            <p className="font-display tabular-nums text-[26px] sm:text-[28px] font-bold text-[#0F172A] leading-tight mt-1">
              {padTwoDigits(openTickets.length)}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1">
              Requieren seguimiento
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E9F2] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3.5">
          <span className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center">
            <Users className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-normal text-[#64748B] leading-snug">
              Técnicos disponibles
            </p>
            <p className="font-display tabular-nums text-[26px] sm:text-[28px] font-bold text-[#0F172A] leading-tight mt-1">
              {padTwoDigits(availableTechs.length)}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1">
              Listos para atender
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E9F2] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3.5">
          <span className="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#8B5CF6] flex items-center justify-center">
            <Monitor className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-normal text-[#64748B] leading-snug">
              Sesiones activas
            </p>
            <p className="font-display tabular-nums text-[26px] sm:text-[28px] font-bold text-[#0F172A] leading-tight mt-1">
              {padTwoDigits(activeSessions.length)}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1">
              Conexiones en curso
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E9F2] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3.5">
          <span className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
            <Clock className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13px] font-normal text-[#64748B] leading-snug">
              Tiempo de respuesta
            </p>
            <p
              data-testid="kpi-response-time"
              className="font-display tabular-nums text-[26px] sm:text-[28px] font-bold text-[#0F172A] leading-tight mt-1"
            >
              {responseTimeMetric.formatted}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1">
              Promedio real de despacho
            </p>
          </div>
        </div>
      </div>

      {/* Middle Row: Solicitudes recientes + Capacidades de la plataforma */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 65% (8 cols): Solicitudes recientes with hairline row dividers */}
        <div className="xl:col-span-8 bg-white border border-[#E5E9F2] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-4 pb-4">
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A] leading-snug">
                Solicitudes recientes
              </h3>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                {normalizedQuery
                  ? `Filtrado por "${searchQuery}" (${filteredTickets.length} resultados)`
                  : 'Seguimiento de actividad de soporte'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateSection('tickets')}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] whitespace-nowrap mt-0.5"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {recentTickets.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#64748B]">
                No se encontraron solicitudes que coincidan con tu búsqueda.
              </div>
            ) : (
              recentTickets.map((ticket, index) => {
                const priorityMeta = getOverviewPriorityStyle(
                  deriveTicketPriority(ticket)
                );
                const statusMeta = getOverviewStatusStyle(ticket.status);
                const avatarStyle = AVATAR_STYLES[index % AVATAR_STYLES.length];
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => onSelectTicket(ticket.id)}
                    className="w-full py-4 first:pt-2 last:pb-3 hover:bg-[#F8FAFC]/80 -mx-2 px-2 rounded-xl transition-colors flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 gap-y-2.5 text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-[190px] flex-1">
                      <span
                        className={`w-10 h-10 rounded-xl text-[13px] font-bold flex items-center justify-center shrink-0 ${avatarStyle}`}
                      >
                        {getInitials(ticket.client_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#0F172A] truncate">
                          {ticket.client_name}
                        </p>
                        <p className="text-[12px] text-[#64748B] tabular-nums truncate mt-0.5">
                          {ticket.ticket_code} · {ticket.category}
                          {ticket.rustdesk_id
                            ? ` · ID ${formatRustDeskId(ticket.rustdesk_id)}`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 ml-auto">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold leading-none ${priorityMeta.className}`}
                      >
                        {priorityMeta.label}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold leading-none ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="pt-3 mt-1 border-t border-[#F1F5F9]">
            <p className="text-[12px] text-[#94A3B8]">
              {supabaseConfigured
                ? 'Sincronizado en tiempo real con Supabase.'
                : 'Datos sincronizados · Selecciona cualquier solicitud para atenderla.'}
            </p>
          </div>
        </div>

        {/* Right 35% (4 cols): Capacidades de la plataforma with hairline row dividers */}
        <div className="xl:col-span-4 bg-white border border-[#E5E9F2] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-3 pb-4">
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A] leading-snug">
                Centro de operaciones
              </h3>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                Capacidades de la plataforma
              </p>
            </div>
            <Activity
              className="w-5 h-5 text-[#94A3B8] shrink-0 mt-0.5"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            <button
              type="button"
              onClick={() => onNavigateSection('workforce')}
              className="w-full text-left py-4 first:pt-2 hover:bg-[#F8FAFC]/80 -mx-2 px-2 rounded-xl transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <Workflow className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#0F172A]">
                    Workforce &amp; Dispatch
                  </p>
                  <p className="text-[12px] text-[#64748B] leading-snug mt-0.5">
                    Disponibilidad y asignación de técnicos
                  </p>
                </div>
              </div>
              <ArrowUpRight
                className="w-4 h-4 text-[#94A3B8] shrink-0"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('ai_workforce')}
              className="w-full text-left py-4 hover:bg-[#F8FAFC]/80 -mx-2 px-2 rounded-xl transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                  <Bot className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#0F172A]">
                    AI Workforce 365
                  </p>
                  <p className="text-[12px] text-[#64748B] leading-snug mt-0.5">
                    Asistencia y automatización inteligente
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase shrink-0 ${
                  activeAiCount > 0
                    ? 'bg-[#F3E8FF] text-[#7C3AED]'
                    : 'bg-slate-100 text-[#64748B]'
                }`}
              >
                {aiAgents.length > 0
                  ? `${activeAiCount}/${aiAgents.length} ACTIVOS`
                  : 'ACTIVO'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('security')}
              className="w-full text-left py-4 last:pb-1 hover:bg-[#F8FAFC]/80 -mx-2 px-2 rounded-xl transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#0F172A]">
                    Seguridad y auditoría
                  </p>
                  <p className="text-[12px] text-[#64748B] leading-snug mt-0.5">
                    Control de acceso y trazabilidad
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase bg-[#F3E8FF] text-[#7C3AED] shrink-0">
                ACTIVO
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Accesos rápidos + Estado de la plataforma */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-8 bg-white border border-[#E5E9F2] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
          <div>
            <h3 className="text-[18px] font-bold text-[#0F172A] leading-snug">
              Accesos rápidos
            </h3>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Atajos para tareas frecuentes
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={onOpenNewTicketModal}
              className="px-4 py-3.5 rounded-xl border border-[#E5E9F2] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-between gap-3 text-left transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Ticket
                  className="w-[18px] h-[18px] text-[#2563EB] shrink-0"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span className="text-[14px] font-medium text-[#334155] truncate">
                  Nueva solicitud
                </span>
              </span>
              <ArrowUpRight
                className="w-4 h-4 text-[#94A3B8] shrink-0"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('devices')}
              className="px-4 py-3.5 rounded-xl border border-[#E5E9F2] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-between gap-3 text-left transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Users
                  className="w-[18px] h-[18px] text-[#059669] shrink-0"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span className="text-[14px] font-medium text-[#334155] truncate">
                  Administrar clientes
                </span>
              </span>
              <ArrowUpRight
                className="w-4 h-4 text-[#94A3B8] shrink-0"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('sessions')}
              className="px-4 py-3.5 rounded-xl border border-[#E5E9F2] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-between gap-3 text-left transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Monitor
                  className="w-[18px] h-[18px] text-[#7C3AED] shrink-0"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span className="text-[14px] font-medium text-[#334155] truncate">
                  Sesiones remotas
                </span>
              </span>
              <ArrowUpRight
                className="w-4 h-4 text-[#94A3B8] shrink-0"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 bg-white border border-[#E5E9F2] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[18px] font-bold text-[#0F172A] leading-snug">
                Estado de la plataforma
              </h3>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                {supabaseConfigured
                  ? 'Supabase PostgreSQL + Realtime'
                  : 'Entorno operativo activo'}
              </p>
            </div>
            <CheckCircle2
              className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5"
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#ECFDF5]/85 flex items-center gap-3.5">
            <span
              className="w-6 h-6 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-[#065F46]">
                Interfaz disponible
              </p>
              <p className="text-[12px] text-[#047857] mt-0.5">
                {supabaseConfigured
                  ? 'Conectado a Supabase Realtime y Gemini AI'
                  : 'Modo demostración sincronizado + Gemini AI'}
              </p>
            </div>
          </div>

          <p className="text-[12px] text-[#94A3B8]">
            Relay: {organization.rustdesk_relay_domain}
          </p>
        </div>
      </div>

      {/* Quiet Dashboard Footer */}
      <footer className="pt-4 border-t border-[#E5E9F2]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[12px] text-[#94A3B8]">
        <p>© 2026 Remote Support 365</p>
        <p>Espacio operativo · {organization.name}</p>
      </footer>
    </div>
  );
}
